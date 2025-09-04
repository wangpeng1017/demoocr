"use client";
import { UploadArea } from "@/components/UploadArea";
import { ModelCard } from "@/components/ModelCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function Home() {
  return <HomeClient />;
}

function HomeClient() {
  const [data, setData] = useState<any | null>(null);

  return (
    <div className="container mx-auto max-w-6xl py-8 space-y-6">
      <h1 className="text-2xl font-bold">商品标签多模型结构化信息提取</h1>
      <UploadArea onResult={setData} />

      <Card>
        <CardHeader>
          <CardTitle>聚合结果</CardTitle>
        </CardHeader>
        <CardContent>
          {!data && <div className="text-sm text-muted-foreground">请先上传文件并开始处理</div>}
          {data && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                输入：{data?.input?.type} {data?.input?.filename}
                {typeof data?.input?.framesProcessed === "number" && `（已处理帧：${data.input.framesProcessed}）`}
              </div>
              {Array.isArray(data?.aggregated?.items) && data.aggregated.items.length > 0 ? (
                <ul className="list-disc pl-6 text-sm">
                  {data.aggregated.items.map((it: any, idx: number) => (
                    <li key={idx}>
                      <span className="font-medium">{it.product_name}</span> — {it.price}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm">暂无结构化聚合结果</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ModelCard title="Gemini 2.5 Pro" result={data?.models?.gemini_pro} />
        <ModelCard title="Gemini 2.5 Flash" result={data?.models?.gemini_flash} />
        <ModelCard title="GLM-4V" result={data?.models?.glm_4v} />
        <ModelCard title="百度 OCR" result={data?.models?.baidu_ocr} />
        <ModelCard title="阿里云 OCR" result={data?.models?.aliyun_ocr} />
      </div>

      {data?.note && (
        <div className="text-sm text-muted-foreground">{data.note}</div>
      )}
    </div>
  );
}
