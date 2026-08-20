
import React, { useMemo, useState } from "react";
import {
  allocate100,
  buildWorksheet,
  rebalanceTo100,
  type Worksheet,
  type WorksheetQuestion
} from "./worksheet-workflow";

export function WorksheetWorkflowPanel({
  initialWorksheet,
  onGoTopics,
  onPublished
}: {
  initialWorksheet?: Worksheet | null;
  onGoTopics?: (worksheet: Worksheet) => void;
  onPublished?: (worksheet: Worksheet) => void;
}) {
  const [mode,setMode]=useState<"format"|"generate">("format");
  const [content,setContent]=useState("");
  const [count,setCount]=useState(20);
  const [loading,setLoading]=useState(false);
  const [preview,setPreview]=useState(false);
  const [ws,setWs]=useState<Worksheet|null>(initialWorksheet || null);
  const [error,setError]=useState("");

  const total=useMemo(()=>ws?.questions.reduce((s,q)=>s+(Number(q.points)||0),0) || 0,[ws]);

  async function generate(){
    if(!content.trim()) return setError("請先貼上教材或工作紙內容。");
    setLoading(true);setError("");
    try{
      const result=await buildWorksheet(WORKSHEET_WORKER_URL,content,count,mode);
      setWs(result);
      setPreview(true);
    }catch(e:any){setError(e?.message || "AI 生成失敗");}
    finally{setLoading(false);}
  }

  function updateQuestion(id:string, patch:Partial<WorksheetQuestion>){
    if(!ws)return;
    setWs({...ws,questions:rebalanceTo100(ws.questions.map(q=>q.id===id?{...q,...patch}:q)),totalPoints:100});
  }

  function saveDraft(){
    if(!ws)return;
    saveWorksheetDraft(ws);
    setError("");
  }

  function publish(){
    if(!ws)return;
    saveWorksheetDraft(ws);
    onGoTopics?.(ws);
  }

  return (
    <div className="worksheet-workflow-panel">
      <div className="worksheet-toolbar">
        <h2>AI 工作紙建立器</h2>
        <span>總分：<strong>100</strong> 分</span>
      </div>

      {!ws && <>
        <div className="worksheet-mode">
          <button onClick={()=>setMode("format")} className={mode==="format"?"active":""}>
            整理現有工作紙
          </button>
          <button onClick={()=>setMode("generate")} className={mode==="generate"?"active":""}>
            AI 出題
          </button>
        </div>
        <textarea
          value={content}
          onChange={e=>setContent(e.target.value)}
          placeholder={mode==="format"
            ?"直接貼上你原本的工作紙內容。AI 會幫你辨認 MC、填充、是非、短答等題型，再整理成網站工作紙。"
            :"貼上教材／課堂筆記，AI 會根據內容建立工作紙。"}
          rows={14}
        />
        <label>
          題目數量：
          <select value={count} onChange={e=>setCount(Number(e.target.value))}>
            {[3,5,10,15,20,25,30,40].map(n=><option key={n} value={n}>{n} 題</option>)}
          </select>
        </label>
        <button disabled={loading} onClick={generate}>
          {loading?"AI 整理中…":"建立工作紙"}
        </button>
      </>}

      {ws && <>
        <input
          value={ws.title}
          onChange={e=>setWs({...ws,title:e.target.value})}
          placeholder="工作紙標題"
        />
        <textarea
          value={ws.instructions}
          onChange={e=>setWs({...ws,instructions:e.target.value})}
          placeholder="學生作答指示"
          rows={3}
        />

        <div className="worksheet-actions">
          <button onClick={()=>setPreview(true)}>👁 預覽學生版</button>
          <button onClick={saveDraft}>💾 儲存草稿</button>
          <button onClick={()=>setWs(null)}>↩ 重新建立</button>
          <button onClick={publish}>➡ 前往課題管理發布</button>
        </div>

        <p><strong>{ws.questions.length}</strong> 題　／　總分 <strong>{total}</strong> 分</p>

        {ws.questions.map((q,i)=>(
          <div className="worksheet-question-editor" key={q.id}>
            <div>
              <strong>{i+1}.</strong>
              <input
                value={q.question}
                onChange={e=>updateQuestion(q.id,{question:e.target.value})}
              />
              <span>{q.points} 分</span>
            </div>
            {q.options?.map((o,j)=>(
              <input
                key={j}
                value={o}
                onChange={e=>{
                  const opts=[...(q.options||[])]; opts[j]=e.target.value;
                  updateQuestion(q.id,{options:opts});
                }}
                placeholder={`選項 ${String.fromCharCode(65+j)}`}
              />
            ))}
          </div>
        ))}
      </>}

      {preview && ws && (
        <div className="worksheet-preview-overlay">
          <div className="worksheet-preview">
            <button onClick={()=>setPreview(false)}>✕</button>
            <h1>{ws.title}</h1>
            <p>{ws.instructions}</p>
            {ws.questions.map((q,i)=>(
              <div key={q.id} className="worksheet-preview-question">
                <h3>{i+1}. {q.question} <small>({q.points}分)</small></h3>
                {q.options?.map((o,j)=><div key={j}>○ {String.fromCharCode(65+j)}. {o}</div>)}
                {q.type==="tf" && <div>○ 是　 ○ 否</div>}
                {q.type==="fill" && <div>____________________________</div>}
                {q.type==="short" && <div className="short-answer-line">____________________________<br/>____________________________</div>}
              </div>
            ))}
            <hr/>
            <strong>總分：100 分</strong>
          </div>
        </div>
      )}

      {error && <div className="worksheet-error">{error}</div>}
    </div>
  );
}
