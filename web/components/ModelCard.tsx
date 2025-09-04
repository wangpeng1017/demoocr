import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ModelCard({ title, result }: { title: string; result: any }) {
  const statusColor = result?.status === "fulfilled" ? "text-green-600" : result?.status === "rejected" ? "text-red-600" : "";
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          {typeof result?.durationMs === "number" && (
            <span className="text-sm text-muted-foreground">{result.durationMs} ms</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`text-sm ${statusColor}`}>状态：{result?.status ?? "-"}</div>
        {Array.isArray(result?.structured) && result.structured.length > 0 && (
          <div>
            <div className="font-medium mb-2">结构化结果</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品名称</TableHead>
                  <TableHead>价格</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.structured.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {result?.rawText && (
          <div>
            <div className="font-medium mb-2">原始识别文本</div>
            <ScrollArea className="h-40 rounded border p-2 text-sm whitespace-pre-wrap">
              {result.rawText}
            </ScrollArea>
          </div>
        )}
        {result?.error && (
          <div className="text-sm text-red-600">错误：{result.error}</div>
        )}
      </CardContent>
    </Card>
  );
}

