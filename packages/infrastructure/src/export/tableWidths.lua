-- Doku pandoc filter shared by both PDF profiles (LuaLaTeX and WeasyPrint).
--
-- 1. Tables get explicit column widths from the same algorithm the preview
--    uses (apps/desktop/.../tableColumnLayout.ts): every column needs at
--    least its longest unbreakable body token, wants its longest line, and the
--    leftover width is shared in proportion to that wish ("fit" mode, no word
--    is ever split). Only when even the minima overflow the A4 text column do
--    the columns shrink with square-root weights and tokens break anywhere
--    ("dense" mode). The table is tagged with the mode so the stylesheet /
--    preamble can switch the wrapping rules.
-- 2. Header cells are set in bold, like the preview.
-- 3. For LaTeX, long tokens that cannot fit their column receive
--    discretionary break points (UTF-8 safe) so a cell never runs past its
--    neighbour, and long prose tokens (URLs, hashes) get the same safety net.
-- 4. Task-list check boxes and horizontal rules get Doku markup.
--
-- Only Lua API calls available since Pandoc 2.9 are used; the Table rules
-- bail out on the legacy Table AST without column specs.

local text = pandoc.text

-- Keep in sync with tableColumnLayout.ts: text widths are estimated per
-- glyph class with a safety factor; the same estimate decides where a token
-- that cannot fit may break. Dense tables use the tight cell padding.
local WIDTH_SAFETY = 1.08
local PADDING_EM = 1.2
local DENSE_PADDING_EM = 0.7
local SAFETY_EM = 0.25
local MAX_LINE_CHARS = 48
local MIN_CHARS = 3
local PROSE_CHARS = 24
local PROSE_MIN_CHARS = 10
local MIN_TOKEN_EM = MIN_CHARS * 0.6
local MAX_LINE_EM = MAX_LINE_CHARS * 0.55
-- A4 text column (210 - 26 - 16 mm) in em of the table font (0.95 x 11 pt).
local A4_TABLE_WIDTH_EM = (168 / 25.4) * 72 / (11 * 0.95)

local function utf8_len(s)
  local ok, n = pcall(text.len, s)
  if ok and n then return n end
  return #s
end

local function utf8_sub(s, i, j)
  local ok, out = pcall(text.sub, s, i, j)
  if ok and out then return out end
  return s:sub(i, j)
end

local function cell_text(cell)
  return pandoc.utils.stringify(cell.contents or cell)
end

local NARROW = { ['i']=1, ['j']=1, ['l']=1, ['t']=1, ['f']=1, ['r']=1, ['.']=1, [',']=1, ["'"]=1, [';']=1, [':']=1, ['!']=1, ['|']=1, ['`']=1 }
local WIDE_LOWER = { ['m']=1, ['w']=1 }
local WIDE_UPPER = { ['M']=1, ['W']=1 }
local BRACKETS = { ['(']=1, [')']=1, ['[']=1, [']']=1, ['{']=1, ['}']=1, ['/']=1, ['\\']=1 }

-- Estimated advance width of one glyph (code point) in em.
local function glyph_width(code)
  if code > 127 then
    if code >= 0xC0 and code <= 0xDE then return 0.72 end
    return 0.58
  end
  local c = string.char(code)
  if c == ' ' then return 0.28 end
  if NARROW[c] then return 0.3 end
  if WIDE_LOWER[c] then return 0.82 end
  if WIDE_UPPER[c] then return 0.95 end
  if c == '-' then return 0.36 end
  if BRACKETS[c] then return 0.38 end
  if c == '_' then return 0.55 end
  if c:match('%d') then return 0.56 end
  if c:match('%u') then return 0.7 end
  if c:match('%l') then return 0.52 end
  return 0.58
end

local function iter_codes(s)
  local ok, iterator, state, init = pcall(utf8.codes, s)
  if ok then return iterator, state, init end
  -- Invalid UTF-8: fall back to bytes.
  return string.gmatch(s, '()(.)'), nil, nil
end

local function text_width(s)
  local width = 0
  local ok, err = pcall(function()
    for _, code in utf8.codes(s) do width = width + glyph_width(code) end
  end)
  if not ok then
    width = 0
    for i = 1, #s do width = width + glyph_width(s:byte(i)) end
  end
  return width
end

local function longest_token_em(s)
  local longest = 0
  for token in s:gmatch("%S+") do
    local w = text_width(token)
    if w > longest then longest = w end
  end
  return longest
end

local function token_fits(token, content_width)
  return text_width(token) * WIDTH_SAFETY <= content_width
end

-- Splits a token that does not fit into chunks that do (greedy by estimated
-- width). Returns nil when it fits.
local function chunk_token(token, content_width)
  if token_fits(token, content_width) then return nil end
  local limit = math.max(content_width / WIDTH_SAFETY, 0.95 * MIN_CHARS)
  local chunks, current, width = {}, {}, 0
  local ok = pcall(function()
    for _, code in utf8.codes(token) do
      local advance = glyph_width(code)
      if #current > 0 and width + advance > limit then
        table.insert(chunks, table.concat(current))
        current, width = {}, 0
      end
      table.insert(current, utf8.char(code))
      width = width + advance
    end
  end)
  if not ok then return nil end
  if #current > 0 then table.insert(chunks, table.concat(current)) end
  return chunks
end

local function sum(list)
  local total = 0
  for _, v in ipairs(list) do total = total + v end
  return total
end

local function measure(columns)
  local measures = {}
  for i, column in ipairs(columns) do
    local token_em
    if #column.cells > 0 then
      token_em = 0
      for _, c in ipairs(column.cells) do
        local w = longest_token_em(c)
        if w > token_em then token_em = w end
      end
    else
      token_em = longest_token_em(column.header)
    end
    local line_em = text_width(column.header)
    local line_chars = utf8_len(column.header)
    for _, c in ipairs(column.cells) do
      local w = text_width(c)
      if w > line_em then line_em = w end
      local n = utf8_len(c)
      if n > line_chars then line_chars = n end
    end
    measures[i] = { token_em = token_em, line_em = math.min(line_em, MAX_LINE_EM), line_chars = line_chars }
  end
  return measures
end

local function minimum_width(token_em, padding)
  return math.max(token_em, MIN_TOKEN_EM) * WIDTH_SAFETY + SAFETY_EM + padding
end

local function maximum_width(line_em, minimum, padding)
  return math.max(minimum, line_em * WIDTH_SAFETY + SAFETY_EM + padding)
end

local function minimums_for(measures, padding)
  local minimums = {}
  for i, m in ipairs(measures) do minimums[i] = minimum_width(m.token_em, padding) end
  return minimums
end

-- Fit distribution: minima plus the leftover shared by the wish to grow.
local function distribute(minimums, measures, available, padding)
  local sum_min = sum(minimums)
  local extra = available - sum_min
  local growth, sum_growth = {}, 0
  for i, minimum in ipairs(minimums) do
    growth[i] = math.max(maximum_width(measures[i].line_em, minimum, padding) - minimum, 0)
    sum_growth = sum_growth + growth[i]
  end
  local widths = {}
  for i, minimum in ipairs(minimums) do
    if sum_growth > 0 then
      widths[i] = minimum + extra * growth[i] / sum_growth
    else
      widths[i] = minimum + extra * minimum / sum_min
    end
  end
  return widths
end

-- Dense shrink: prose columns first (down to a readable line), then everyone.
local function shrink(minimums, measures, available, padding)
  local floor = minimum_width(MIN_TOKEN_EM, padding)
  local prose_floor = minimum_width(PROSE_MIN_CHARS * 0.55, padding)
  local widths = {}
  for i, minimum in ipairs(minimums) do widths[i] = minimum end
  local deficit = sum(widths) - available
  local tiers = {
    function(i)
      if measures[i].line_chars > PROSE_CHARS then return math.max(widths[i] - prose_floor, 0) end
      return 0
    end,
    function(i) return math.max(widths[i] - floor, 0) end,
  }
  for _, slack_of in ipairs(tiers) do
    if deficit <= 0 then break end
    local slack, sum_slack = {}, 0
    for i = 1, #widths do
      slack[i] = slack_of(i)
      sum_slack = sum_slack + slack[i]
    end
    if sum_slack > 0 then
      local taken = math.min(deficit, sum_slack)
      for i = 1, #widths do widths[i] = widths[i] - taken * slack[i] / sum_slack end
      deficit = deficit - taken
    end
  end
  return widths
end

-- Returns { mode, fractions, content_widths, widths, padding }.
local function layout_columns(columns, available_em)
  local count = #columns
  local measures = measure(columns)
  local available = math.max(available_em, count * minimum_width(MIN_TOKEN_EM, DENSE_PADDING_EM))
  local mode, padding = 'fit', PADDING_EM
  local minimums = minimums_for(measures, padding)
  local widths
  if sum(minimums) <= available then
    widths = distribute(minimums, measures, available, padding)
  else
    mode = 'dense'
    padding = DENSE_PADDING_EM
    minimums = minimums_for(measures, padding)
    if sum(minimums) <= available then
      widths = distribute(minimums, measures, available, padding)
    else
      widths = shrink(minimums, measures, available, padding)
    end
  end
  local total = sum(widths)
  local fractions, content_widths = {}, {}
  for i = 1, count do
    fractions[i] = widths[i] / total
    content_widths[i] = math.max(widths[i] - padding, 0)
  end
  return { mode = mode, fractions = fractions, content_widths = content_widths, widths = widths, total = total, padding = padding }
end

local BREAK_POINT = pandoc.RawInline('latex', '\\discretionary{}{}{}')

local function join_chunks(chunks, make)
  local pieces = {}
  for index, chunk in ipairs(chunks) do
    if index > 1 then table.insert(pieces, BREAK_POINT) end
    table.insert(pieces, make(chunk))
  end
  return pieces
end

-- Inline containers whose children are inlines. `Note` holds blocks and is
-- left alone: footnote bodies are prose in their own right.
local INLINE_CHILDREN = { 'content', 'inlines', 'caption' }

-- `split` returns the chunks of a token that is too long, or nil. Inline
-- code is split too: identifiers and paths in narrow cells are the usual
-- offenders, and each chunk is still escaped by pandoc as Code.
local function map_inlines(inlines, split)
  local result = {}
  for _, inline in ipairs(inlines or {}) do
    if inline.t == 'Str' or inline.t == 'Code' then
      local chunks = split(inline.text)
      if chunks then
        local make = inline.t == 'Str' and pandoc.Str or function(chunk)
          return pandoc.Code(chunk, inline.attr)
        end
        for _, piece in ipairs(join_chunks(chunks, make)) do table.insert(result, piece) end
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

-- Outside tables, only very long tokens (URL-like strings, hashes, joined
-- words) get break points: normal prose keeps hyphenation and kerning. The
-- chunks fit a quarter of the text column, so a long token wraps gracefully
-- even in a larger heading face.
local PROSE_LONG_TOKEN = 30
local PROSE_CHUNK_EM = (168 / 25.4) * 72 / 11 / 4

local function split_in_prose(token)
  if utf8_len(token) <= PROSE_LONG_TOKEN then return nil end
  return chunk_token(token, PROSE_CHUNK_EM)
end

local function is_latex()
  return FORMAT:match('latex') ~= nil
end

function Header(header)
  if not is_latex() then return nil end
  header.content = map_inlines(header.content, split_in_prose)
  return header
end

function Para(para)
  if not is_latex() then return nil end
  para.content = map_inlines(para.content, split_in_prose)
  return para
end

function Plain(plain)
  if not is_latex() then return nil end
  plain.content = map_inlines(plain.content, split_in_prose)
  return plain
end

-- Full-width hairline in the paper palette, like the preview's <hr>.
function HorizontalRule()
  if not is_latex() then return nil end
  return pandoc.RawBlock('latex', '\\dokurule')
end

-- Header cells: bold, and in the primary ink for LaTeX (the HTML header
-- colour comes from the stylesheet).
local function strong_cell(cell, latex)
  local blocks = {}
  for _, block in ipairs(cell.contents or {}) do
    if (block.t == 'Plain' or block.t == 'Para') and #block.content > 0 then
      local content = { pandoc.Strong(block.content) }
      if latex then table.insert(content, 1, pandoc.RawInline('latex', '\\color{dokuink}')) end
      block.content = content
    end
    table.insert(blocks, block)
  end
  cell.contents = blocks
  return cell
end

local function make_cells_breakable(cell, content_width)
  cell.contents = map_blocks(cell.contents, function(token)
    return chunk_token(token, content_width)
  end)
  return cell
end

function Table(tbl)
  -- Pandoc < 2.10 exposes the legacy Table type, which has no column specs.
  if type(tbl.colspecs) ~= 'table' then return nil end
  local ncols = #tbl.colspecs
  if ncols == 0 then return nil end

  local columns = {}
  for i = 1, ncols do columns[i] = { header = '', cells = {} } end
  for _, row in ipairs(tbl.head.rows or {}) do
    for i, cell in ipairs(row.cells) do
      if i <= ncols then
        local t = cell_text(cell)
        if utf8_len(t) > utf8_len(columns[i].header) then columns[i].header = t end
      end
    end
  end
  for _, body in ipairs(tbl.bodies) do
    for _, row in ipairs(body.body or {}) do
      for i, cell in ipairs(row.cells) do
        if i <= ncols then table.insert(columns[i].cells, cell_text(cell)) end
      end
    end
  end

  local layout = layout_columns(columns, A4_TABLE_WIDTH_EM)
  local latex = is_latex()

  -- Header cells in bold; cells in LaTeX get break points when a token is
  -- wider than its column (always in dense mode, never needed in fit mode
  -- except as a safety net for glyph-width estimates).
  local head_rows = {}
  for _, row in ipairs(tbl.head.rows or {}) do
    local cells = {}
    for i, cell in ipairs(row.cells) do
      cell = strong_cell(cell, latex)
      if latex and layout.content_widths[i] then cell = make_cells_breakable(cell, layout.content_widths[i]) end
      table.insert(cells, cell)
    end
    row.cells = cells
    table.insert(head_rows, row)
  end
  tbl.head.rows = head_rows

  if latex then
    local bodies = {}
    for _, body in ipairs(tbl.bodies) do
      local rows = {}
      for _, row in ipairs(body.body or {}) do
        local cells = {}
        for i, cell in ipairs(row.cells) do
          if layout.content_widths[i] then cell = make_cells_breakable(cell, layout.content_widths[i]) end
          table.insert(cells, cell)
        end
        row.cells = cells
        table.insert(rows, row)
      end
      body.body = rows
      table.insert(bodies, body)
    end
    tbl.bodies = bodies
  end

  -- Column widths. LaTeX applies the fraction to the content width (the
  -- padding is \tabcolsep), HTML to the full cell width.
  if latex then
    local content_total = 0
    for i = 1, ncols do content_total = content_total + (layout.widths[i] - layout.padding) end
    for i = 1, ncols do
      local align = tbl.colspecs[i][1]
      tbl.colspecs[i] = { align, (layout.widths[i] - layout.padding) / content_total }
    end
  else
    for i = 1, ncols do
      local align = tbl.colspecs[i][1]
      tbl.colspecs[i] = { align, layout.fractions[i] }
    end
  end

  -- The mode travels on a wrapping Div: HTML renders it as a classed <div>
  -- the stylesheet keys on; for LaTeX a dense table gets the tight cell
  -- padding (\tabcolsep, 0.35em of the table font) around it.
  if latex then
    if layout.mode == 'dense' then
      return pandoc.Div({
        pandoc.RawBlock('latex', '\\begingroup\\setlength{\\tabcolsep}{3.6pt}'),
        tbl,
        pandoc.RawBlock('latex', '\\endgroup'),
      }, pandoc.Attr('', {}))
    end
    return tbl
  end
  local classes = { 'doku-table', 'doku-table--' .. layout.mode }
  return pandoc.Div({ tbl }, pandoc.Attr('', classes))
end

-- Task-list items: pandoc keeps ☐ / ☒ as the first inline of the item. The
-- HTML writer would turn them into <input type="checkbox">, which prints as a
-- bare form control; a span styled like the preview's check box is used
-- instead. LaTeX keeps pandoc's $\square$/$\boxtimes$, redrawn by the preamble.
local function replace_task_box(item)
  local first = item[1]
  if not first or (first.t ~= 'Plain' and first.t ~= 'Para') then return item end
  local inlines = first.content
  local marker = inlines[1]
  if not marker or marker.t ~= 'Str' then return item end
  local checked
  if marker.text == '\226\152\144' then checked = false end -- ☐
  if marker.text == '\226\152\146' then checked = true end  -- ☒
  if checked == nil then return item end
  local html = checked
    and '<span class="doku-task doku-task--checked" aria-hidden="true"></span>'
    or '<span class="doku-task" aria-hidden="true"></span>'
  inlines[1] = pandoc.RawInline('html', html)
  first.content = inlines
  item[1] = first
  return item
end

local function is_task_item(item)
  local first = item[1]
  if not first or (first.t ~= 'Plain' and first.t ~= 'Para') then return false end
  local marker = first.content[1]
  return marker ~= nil and marker.t == 'Str'
    and (marker.text == '\226\152\144' or marker.text == '\226\152\146')
end

function BulletList(list)
  if is_latex() then return nil end
  local all_tasks = #list.content > 0
  for _, item in ipairs(list.content) do
    if not is_task_item(item) then all_tasks = false end
  end
  if not all_tasks then return nil end
  local items = {}
  for _, item in ipairs(list.content) do table.insert(items, replace_task_box(item)) end
  list.content = items
  return pandoc.Div({ list }, pandoc.Attr('', { 'doku-task-list' }))
end
