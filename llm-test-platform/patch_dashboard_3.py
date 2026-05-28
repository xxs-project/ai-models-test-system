import os

file_path = "../../src/pages/Board.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# the TableHead
head_old = """                    <TableHead>每卡TPS</TableHead>
                    <TableHead>详情</TableHead>
                  </TableRow>
                </TableHeader>"""
head_new = """                    <TableHead>每卡TPS</TableHead>
                  </TableRow>
                </TableHeader>"""

# the TableCell in PerfDragonTigerBoard is around the end of the file.
# Need to make sure we don't accidentally replace the one in InteractiveBoard.
# InteractiveBoard table is around line 1092.
# PerfDragonTigerBoard table is around line 1527.

# Find the start of PerfDragonTigerBoard
perf_start = content.find("function PerfDragonTigerBoard()")

if perf_start != -1:
    board_content = content[perf_start:]
    
    # replace TableHead
    board_content = board_content.replace(
        "<TableHead>详情</TableHead>",
        ""
    )
    
    # replace TableCell
    cell_old = """<TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setViewDetails(record)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>"""
    board_content = board_content.replace(cell_old, "")
    
    content = content[:perf_start] + board_content

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("done")
