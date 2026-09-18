-- Doku pandoc filter (LaTeX export): give wide or text-heavy pipe tables
-- relative column widths, so LuaLaTeX lays them out as wrapping longtables
-- inside the text column instead of letting them run off the A4 sheet.
-- Column widths are proportional to the square root of each column's longest
-- cell, with a floor so narrow columns stay readable.
--
-- The filter only uses Lua API calls available since Pandoc 2.9 (the oldest
-- Pandoc a supported host can bundle): no `:walk`, and the Table rules bail
-- out when the host predates the current Table AST.

local function cell_text(cell)
  return pandoc.utils.stringify(cell.contents or cell)
end

local function longest_per_column(tbl, ncols)
  local widest = {}
  for i = 1, ncols do widest[i] = 0 end
  local function scan(rows)
    for _, row in ipairs(rows or {}) do
      local cells = row.cells or row
      for i, cell in ipairs(cells) do
        if i <= ncols then
          local text = cell_text(cell)
          -- Longest unbreakable token matters more than total length.
          local token = 0
          for word in text:gmatch("%S+") do
            if #word > token then token = #word end
          end
          local score = math.max(#text * 0.55, token)
          if score > widest[i] then widest[i] = score end
        end
      end
    end
  end
  scan(tbl.head.rows)
  for _, body in ipairs(tbl.bodies) do
    scan(body.body)
  end
  return widest
end

-- Splits one long token into chunks joined by zero-width break points.
local function split_token(text, long_token, every)
  if #text <= long_token then return nil end
  local pieces = {}
  local position = 1
  while position <= #text do
    table.insert(pieces, pandoc.Str(text:sub(position, position + every - 1)))
    position = position + every
    if position <= #text then
      table.insert(pieces, pandoc.RawInline('latex', '\\hspace{0pt}'))
    end
  end
  return pieces
end

-- Inline containers whose children are inlines. `Note` holds blocks and is
-- left alone: footnote bodies are prose in their own right.
local INLINE_CHILDREN = { 'content', 'inlines', 'caption' }

-- Rebuilds an inline list with `split` applied to every Str. Elements are
-- reassigned instead of mutated in place, because Pandoc hands Lua copies.
local function map_inlines(inlines, split)
  local result = {}
  for _, inline in ipairs(inlines or {}) do
    if inline.t == 'Str' then
      local pieces = split(inline.text)
      if pieces then
        for _, piece in ipairs(pieces) do table.insert(result, piece) end
      else
        table.insert(result, inline)
      end
    else
      if inline.t ~= 'Note' then
        for _, field in ipairs(INLINE_CHILDREN) do
          if type(inline[field]) == 'table' then
            inline[field] = map_inlines(inline[field], split)
          end
        end
      end
      table.insert(result, inline)
    end
  end
  return result
end

local function map_blocks(blocks, split)
  local result = {}
  for _, block in ipairs(blocks or {}) do
    local kind = block.t
    if kind == 'Para' or kind == 'Plain' or kind == 'Header' then
      block.content = map_inlines(block.content, split)
    elseif kind == 'BulletList' or kind == 'OrderedList' then
      local items = {}
      for _, item in ipairs(block.content or {}) do
        table.insert(items, map_blocks(item, split))
      end
      block.content = items
    elseif kind == 'BlockQuote' or kind == 'Div' then
      block.content = map_blocks(block.content, split)
    end
    table.insert(result, block)
  end
  return result
end

-- Inside table cells, long unbreakable tokens (identifiers, URLs, hashes)
-- get discretionary break points every few characters, mirroring the
-- preview's `overflow-wrap: anywhere` so a narrow column never overflows
-- into its neighbour.
local BREAK_EVERY = 4
local LONG_TOKEN = 6

local function split_in_cell(text)
  return split_token(text, LONG_TOKEN, BREAK_EVERY)
end

-- Outside tables, only very long tokens (URL-like strings, hashes, joined
-- words) get break points: normal prose keeps hyphenation and kerning.
local PROSE_LONG_TOKEN = 30
local PROSE_BREAK_EVERY = 10

local function split_in_prose(text)
  return split_token(text, PROSE_LONG_TOKEN, PROSE_BREAK_EVERY)
end

local function make_rows_breakable(rows)
  local result = {}
  for _, row in ipairs(rows or {}) do
    local cells = {}
    for _, cell in ipairs(row.cells) do
      cell.contents = map_blocks(cell.contents, split_in_cell)
      table.insert(cells, cell)
    end
    row.cells = cells
    table.insert(result, row)
  end
  return result
end

function Header(header)
  if not FORMAT:match('latex') then return nil end
  header.content = map_inlines(header.content, split_in_prose)
  return header
end

function Para(para)
  if not FORMAT:match('latex') then return nil end
  para.content = map_inlines(para.content, split_in_prose)
  return para
end

function Plain(plain)
  if not FORMAT:match('latex') then return nil end
  plain.content = map_inlines(plain.content, split_in_prose)
  return plain
end

function Table(tbl)
  -- Pandoc < 2.10 exposes the legacy Table type, which has no column specs.
  if type(tbl.colspecs) ~= 'table' then return nil end
  local ncols = #tbl.colspecs
  if ncols == 0 then return nil end
  if FORMAT:match('latex') then
    tbl.head.rows = make_rows_breakable(tbl.head.rows)
    local bodies = {}
    for _, body in ipairs(tbl.bodies) do
      body.body = make_rows_breakable(body.body)
      table.insert(bodies, body)
    end
    tbl.bodies = bodies
  end
  local widest = longest_per_column(tbl, ncols)
  local total = 0
  local needs_wrap = ncols >= 5
  for i = 1, ncols do
    total = total + widest[i]
    if widest[i] > 28 then needs_wrap = true end
  end
  if not needs_wrap or total == 0 then return nil end

  local weights = {}
  local sum = 0
  for i = 1, ncols do
    weights[i] = math.max(math.sqrt(widest[i]), 1.6)
    sum = sum + weights[i]
  end
  for i = 1, ncols do
    local align = tbl.colspecs[i][1]
    tbl.colspecs[i] = { align, weights[i] / sum }
  end
  return tbl
end
