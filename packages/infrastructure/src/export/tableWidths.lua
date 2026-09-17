-- Doku pandoc filter (LaTeX export): give wide or text-heavy pipe tables
-- relative column widths, so LuaLaTeX lays them out as wrapping longtables
-- inside the text column instead of letting them run off the A4 sheet.
-- Column widths are proportional to the square root of each column's longest
-- cell, with a floor so narrow columns stay readable.

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

-- Inside table cells, long unbreakable tokens (identifiers, URLs, hashes)
-- get discretionary break points every few characters, mirroring the
-- preview's `overflow-wrap: anywhere` so a narrow column never overflows
-- into its neighbour.
local BREAK_EVERY = 4
local LONG_TOKEN = 6

local function breakable(inlines)
  return inlines:walk({
    Str = function(str)
      local text = str.text
      if #text <= LONG_TOKEN then return nil end
      local pieces = {}
      local position = 1
      while position <= #text do
        local chunk = text:sub(position, position + BREAK_EVERY - 1)
        table.insert(pieces, pandoc.Str(chunk))
        position = position + BREAK_EVERY
        if position <= #text then
          table.insert(pieces, pandoc.RawInline('latex', '\\hspace{0pt}'))
        end
      end
      return pieces
    end,
  })
end

local function make_cells_breakable(rows)
  for _, row in ipairs(rows or {}) do
    for _, cell in ipairs(row.cells) do
      cell.contents = cell.contents:walk({
        Plain = function(block) return pandoc.Plain(breakable(block.content)) end,
        Para = function(block) return pandoc.Para(breakable(block.content)) end,
      })
    end
  end
end

-- Outside tables, only very long tokens (URL-like strings, hashes, joined
-- words) get break points: normal prose keeps hyphenation and kerning.
local PROSE_LONG_TOKEN = 30
local PROSE_BREAK_EVERY = 10

local function breakable_prose(inlines)
  return inlines:walk({
    Str = function(str)
      local text = str.text
      if #text <= PROSE_LONG_TOKEN then return nil end
      local pieces = {}
      local position = 1
      while position <= #text do
        table.insert(pieces, pandoc.Str(text:sub(position, position + PROSE_BREAK_EVERY - 1)))
        position = position + PROSE_BREAK_EVERY
        if position <= #text then
          table.insert(pieces, pandoc.RawInline('latex', '\\hspace{0pt}'))
        end
      end
      return pieces
    end,
  })
end

function Header(header)
  if not FORMAT:match('latex') then return nil end
  header.content = breakable_prose(header.content)
  return header
end

function Para(para)
  if not FORMAT:match('latex') then return nil end
  para.content = breakable_prose(para.content)
  return para
end

function Plain(plain)
  if not FORMAT:match('latex') then return nil end
  plain.content = breakable_prose(plain.content)
  return plain
end

function Table(tbl)
  local ncols = #tbl.colspecs
  if ncols == 0 then return nil end
  if FORMAT:match('latex') then
    make_cells_breakable(tbl.head.rows)
    for _, body in ipairs(tbl.bodies) do
      make_cells_breakable(body.body)
    end
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
