
import { supabase } from './supabase';
// Worksheet Workflow vFinal
import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Camera, Check, ChevronLeft, ChevronRight, Clipboard,
  Copy, Edit3, GraduationCap, Languages, LogOut, Plus, Search,
  Settings, ShieldCheck, Trash2, Upload, UserPlus, Users, X
} from "lucide-react";

type Lang = "zh" | "en";
type Role = "student" | "teacher";
type StudentStatus = "active" | "longAbsence" | "withdrawn";
type View = "home" | "portfolio" | "upload" | "feedback" | "dashboard" | "students" | "topics" | "assessment" | "book" | "grades" | "worksheetLibrary" | "aiWorksheet" | "studentWorksheet";

type WorksheetQuestion = {
  id: string;
  type: "mc" | "fill" | "short";
  question: string;
  questionEn?: string;
  options?: {label:string; zh:string; en?:string}[];
  answer?: string | string[];
  acceptedAnswers?: string[];
  explanation?: string;
  points: number;
};

type Worksheet = {
  id: string;
  titleZh: string;
  titleEn: string;
  classIds: string[];
  studentIds?: string[];
  dueDate: string;
  questions: WorksheetQuestion[];
  sourceName?: string;
  sourceImage?: string;
  sourceImageName?: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt?: string;
  topicId?: string;
};

type Student = {
  id: string; name: string; classId: string; number: string; language: Lang;
  status: StudentStatus; year: string;
};
type ClassItem = { id: string; name: string; language: Lang };
type Topic = {
  id: string; nameZh: string; nameEn: string; date: string; dueDate: string;
  submissions: number; classIds: string[]; rubricId: string; worksheetId?: string;
};
type Submission = {
  id: string; studentId: string; topicId: string; image: string; uploadedAt: string;
  version: number; status: "submitted" | "assessed"; marks?: number[];
  answers?: Record<string,string>; worksheetId?: string; autoScore?: number;
  feedbackGood?: string[]; feedbackImprove?: string[]; comment?: string; assessedAt?: string;
  teacherChecked?: boolean;
};

const TEACHER_PASSWORD = "VA2026";
const AI_WORKER_URL = ((import.meta as any).env?.VITE_AI_WORKER_URL || "https://visual-art-ai.ymanng.workers.dev").replace(/\/$/, "");

const rubric = [
  {
    id: "media", max: 25, zh: "媒介及技法的選擇和運用", en: "Selection and Use of Media and Techniques",
    levels: [
      ["高", "High", "能選擇及掌握精準而有效的媒介及技法來貫徹主題"],
      ["中高", "Upper-middle", "能掌握適當而有效的媒介及技法來凸顯主題"],
      ["中", "Middle", "能掌握適當的媒介及技法來表現主題"],
      ["中低", "Lower-middle", "能運用與主題相關的媒介及技法"],
      ["低", "Low", "未能運用相關的媒介及技法來處理主題"],
      ["0", "0", ""]
    ]
  },
  {
    id: "visual", max: 25, zh: "視覺元素及設計原理的選擇和運用", en: "Selection and Use of Visual Elements and Design Principles",
    levels: [
      ["高", "High", "能選擇及掌握多樣、精準而有效的視覺語言及設計原理來貫徹主題"],
      ["中高", "Upper-middle", "掌握多樣而適當的視覺語言及設計原理來凸顯主題"],
      ["中", "Middle", "能掌握適當的視覺語言及設計原理來表現主題"],
      ["中低", "Lower-middle", "能運用與主題相關的視覺語言及設計原理"],
      ["低", "Low", "未能運用相關的視覺語言及設計原理來處理主題"],
      ["0", "0", ""]
    ]
  },
  {
    id: "creative", max: 25, zh: "創意與想像力", en: "Creativity and Imagination",
    levels: [
      ["高", "High", "能展示個性、獨創性和嶄新的想像"],
      ["中高", "Upper-middle", "能展示個性、原創性和豐富的想像"],
      ["中", "Middle", "能展示個性、原創性和移情／聯想"],
      ["中低", "Lower-middle", "能展示個性或原創性"],
      ["低", "Low", "毫無個性或原創性"],
      ["0", "0", ""]
    ]
  },
  {
    id: "theme", max: 25, zh: "主題傳意", en: "Communication of Theme",
    levels: [
      ["高", "High", "能運用統整而切題的藝術形式／符號，表現不同層次的情感或意念"],
      ["中高", "Upper-middle", "能運用多樣而切題、並互相配合的藝術形式／符號表現情感或意念"],
      ["中", "Middle", "能運用互相配合而切題的藝術形式／符號表現情感或意念"],
      ["中低", "Lower-middle", "能運用互不相干但切題的藝術形式／符號表現情感或意念"],
      ["低", "Low", "未能運用任何切題的藝術形式／符號表現情感或意念"],
      ["0", "0", ""]
    ]
  }
];

const goodOptions = [
  ["media", "Good use of media", "媒介運用良好"],
  ["visual", "Effective visual elements", "視覺元素運用有效"],
  ["creative", "Creative and original ideas", "創意及原創構思"],
  ["composition", "Strong composition", "構圖良好"],
  ["communication", "Good communication of ideas", "主題傳意清晰"],
  ["experiment", "Good experimentation", "有良好實驗及探索"]
];
const improveOptions = [
  ["media", "Develop techniques further", "進一步發展媒介及技法"],
  ["visual", "Improve visual elements", "改善視覺元素運用"],
  ["creative", "Develop ideas further", "進一步發展創意"],
  ["composition", "Improve composition", "改善構圖"],
  ["communication", "Communicate the theme more clearly", "更清晰傳達主題"],
  ["detail", "Add more detail", "加入更多細節"],
  ["experiment", "Experiment with different techniques", "嘗試不同技法"]
];

const seedStudents: Student[] = [
  {id:"s1",name:"Chan Tai Man",classId:"2A",number:"12",language:"en",status:"active",year:"2026-27"},
  {id:"s2",name:"Lee Wai Yan",classId:"2A",number:"08",language:"zh",status:"active",year:"2026-27"},
  {id:"s3",name:"Wong Ho Yin",classId:"2A",number:"21",language:"en",status:"active",year:"2026-27"},
  {id:"s4",name:"Cheung Ka Ming",classId:"2B",number:"15",language:"zh",status:"longAbsence",year:"2026-27"},
  {id:"s5",name:"Lau Wing Yee",classId:"2B",number:"03",language:"en",status:"active",year:"2026-27"},
];
const seedClasses: ClassItem[] = [
  {id:"2A",name:"2A",language:"zh"},{id:"2B",name:"2B",language:"en"},
  {id:"2C",name:"2C",language:"zh"},{id:"2D",name:"2D",language:"en"},{id:"2E",name:"2E",language:"zh"}
];
const seedTopics: Topic[] = [
  {id:"t1",nameZh:"觀察繪畫",nameEn:"Observational Drawing",date:"2026-08-18",dueDate:"2026-08-25",submissions:1,classIds:["2A","2B","2C","2D","2E"],rubricId:"default"},
  {id:"t2",nameZh:"色彩研究",nameEn:"Colour Study",date:"2026-08-25",dueDate:"2026-09-01",submissions:1,classIds:["2A","2B","2C","2D","2E"],rubricId:"default"},
  {id:"t3",nameZh:"混合媒介實驗",nameEn:"Mixed Media Experiments",date:"2026-09-01",dueDate:"2026-09-10",submissions:3,classIds:["2A","2B"],rubricId:"default"}
];

function load<T>(key:string, fallback:T):T {
  try { const x=localStorage.getItem(key); return x ? JSON.parse(x) : fallback; } catch { return fallback; }
}
function now(){ return new Date().toISOString(); }
function dateText(s:string){ return new Date(s).toLocaleDateString("en-GB"); }

/** Normalize raw question data (from paste-import, AI worker, or storage) into this app's
 *  WorksheetQuestion shape, where options are {label, zh, en?} objects — NOT plain strings.
 *  Accepts three input shapes for `options`: already-correct object array, a plain string
 *  array, or a lettered object map like {A:"...",B:"..."} (the AI worker's format). */
function normalizeQuestions(input:any[]):WorksheetQuestion[]{
  return (Array.isArray(input)?input:[]).map((q,i)=>{
    let options:{label:string;zh:string;en?:string}[]|undefined;
    if(Array.isArray(q?.options)){
      options=q.options.map((o:any,j:number)=>
        o&&typeof o==="object"
          ? {label:String(o.label||String.fromCharCode(65+j)),zh:String(o.zh??o.text??o.value??""),en:o.en?String(o.en):undefined}
          : {label:String.fromCharCode(65+j),zh:String(o)}
      ).filter((o:any)=>o.zh.trim());
    } else if(q?.options&&typeof q.options==="object"){
      options=Object.keys(q.options).map(label=>({label,zh:String(q.options[label]||"")})).filter(o=>o.zh.trim());
    }
    const hasOptions=!!(options&&options.length);
    const type:WorksheetQuestion["type"]=q?.type==="fill"||q?.type==="short"?q.type:(q?.type==="mc"||hasOptions?"mc":"short");
    return {
      id: String(q?.id || `q-${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`),
      type,
      question: String(q?.question||"").trim(),
      questionEn: q?.questionEn?String(q.questionEn):undefined,
      options: type==="mc"?options:undefined,
      answer: typeof q?.answer==="string"?q.answer:Array.isArray(q?.answer)?q.answer:undefined,
      acceptedAnswers: Array.isArray(q?.acceptedAnswers)?q.acceptedAnswers.map((x:any)=>String(x)):undefined,
      explanation: q?.explanation?String(q.explanation):undefined,
      points: Math.max(1, Number(q?.points)||1),
    } as WorksheetQuestion;
  }).filter(q=>q.question);
}

/** Allocate exactly 100 points across questions, keeping every question at least 1 point. */
function allocate100(count:number):number[]{
  const n=Math.max(1,Math.floor(count||1));
  const base=Math.floor(100/n);
  const remainder=100-base*n;
  return Array.from({length:n},(_,i)=>base+(i<remainder?1:0));
}

function rebalanceTo100(questions:any[]):WorksheetQuestion[]{
  const clean=normalizeQuestions(questions);
  if(!clean.length) return [];
  const points=allocate100(clean.length);
  return clean.map((q,i)=>({...q,points:points[i]}));
}


const V4_STYLES = `
.class-tabs{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 14px}
.class-tabs button{border:1px solid #ddd6ce;background:#fff;border-radius:12px;padding:10px 18px;font-weight:700;cursor:pointer}
.class-tabs button.selected{background:#6d28d9;color:#fff;border-color:#6d28d9}
.class-tabs button small{display:block;font-weight:500;opacity:.75;margin-top:2px}
.name-link{display:flex;flex-direction:column;align-items:flex-start;border:0;background:none;padding:0;cursor:pointer;text-align:left;color:inherit}
.name-link b{font-size:16px}.name-link small{color:#888;margin-top:3px}
.clickable-row{width:100%;border:0;background:transparent;text-align:left;cursor:pointer}
.clickable-row:hover{background:#faf7ff}.clickable-row:disabled{cursor:default;opacity:.7}
.selected-row{background:#f5efff}
.row-actions{display:flex;gap:7px;justify-content:flex-end}
.assessment-list .table-row{align-items:center}
.level-buttons{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:10px}
.level-buttons button{min-height:96px;border:1px solid #ddd6ce;background:#fff;border-radius:12px;padding:9px;cursor:pointer;text-align:left}
.level-buttons button.selected{border-color:#6d28d9;background:#f5efff;box-shadow:0 0 0 2px rgba(109,40,217,.12)}
.level-buttons b{display:block;font-size:15px}.level-buttons small{display:block;color:#666;line-height:1.35;margin-top:5px}.level-buttons em{display:block;font-style:normal;font-weight:800;margin-top:7px;color:#6d28d9}
.chosen-range{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0 4px;padding:10px 12px;background:#faf9f7;border-radius:10px}
.score-range-buttons{display:flex;gap:5px;flex-wrap:wrap}.score-range-buttons button{border:1px solid #d8d2ca;background:#fff;border-radius:8px;padding:7px 11px;font-weight:700;cursor:pointer}.score-range-buttons button.selected{background:#6d28d9;color:#fff;border-color:#6d28d9}
.score-input{width:78px;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:16px;font-weight:700}
.portfolio-list{margin-top:22px}.portfolio-list h2{margin-bottom:12px}
.portfolio-list-row{display:grid;grid-template-columns:86px 1fr auto;gap:16px;align-items:center;background:#fff;border:1px solid #e5dfd7;border-radius:14px;padding:12px;margin-bottom:10px}
.portfolio-list-row .thumb{width:86px;height:86px;border-radius:9px;background:#f3f1ee;display:flex;align-items:center;justify-content:center;overflow:hidden}.portfolio-list-row .thumb img{width:100%;height:100%;object-fit:cover}
.portfolio-meta{display:flex;flex-direction:column;gap:4px}.portfolio-meta span{font-size:13px;color:#777}
.stat{cursor:pointer;text-align:left}
.class-settings-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 16px;background:#fff;border:1px solid #e5dfd7;border-radius:12px;margin:0 0 14px}.class-settings-bar>div:first-child{display:flex;gap:14px;align-items:center}.class-settings-bar span{color:#777;font-size:13px}.danger{color:#a33;border-color:#e1caca}.no-submission-row{cursor:default!important}.review-modal-content{max-height:75vh;overflow:auto}.review-modal-content .review-image{max-height:380px;object-fit:contain;background:#f5f3f0}.review-result-score{display:flex;align-items:baseline;gap:4px;margin:12px 0}.review-result-score b{font-size:38px}.review-result-score span{font-size:18px;color:#777}.review-criteria-item{padding:12px 0;border-top:1px solid #eee}.review-criteria-item>div{display:flex;justify-content:space-between;gap:12px}.review-criteria-item span{font-weight:800}.review-criteria-item p{margin:7px 0 0;color:#666;line-height:1.5}.feedback-summary{border-top:1px solid #eee;margin-top:10px;padding-top:10px}.feedback-summary h4{margin:12px 0 5px}.feedback-summary p{margin:0;line-height:1.6}.feedback-item{width:100%;display:grid;grid-template-columns:72px 1fr auto auto;gap:14px;align-items:center;text-align:left}.feedback-item img{width:72px;height:72px;object-fit:cover;border-radius:8px}
@media(max-width:800px){.level-buttons{grid-template-columns:repeat(2,minmax(0,1fr))}.portfolio-list-row{grid-template-columns:68px 1fr auto}.portfolio-list-row .thumb{width:68px;height:68px}}

.builder-hero{background:linear-gradient(135deg,#fff,#f5f7fb);border:1px solid #e5e7eb;border-radius:16px;padding:28px;margin-bottom:18px}
.builder-hero h2{margin:0 0 8px}.builder-hero p{color:#667085;max-width:760px}.builder-steps{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.builder-steps span{padding:9px 12px;border:1px solid #dfe3e8;border-radius:999px;background:#fff;font-size:13px}
.builder-grid{display:grid;grid-template-columns:minmax(280px,.85fr) minmax(360px,1.4fr);gap:18px}.builder-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:18px}.builder-card h2{margin-top:0;font-size:18px}.builder-card label{display:block;margin:12px 0 6px;font-weight:600;font-size:13px}.upload-source{display:flex;align-items:center;gap:10px;margin-bottom:10px}.file-button{display:inline-flex!important;align-items:center;gap:7px;padding:9px 12px;border:1px solid #d0d5dd;border-radius:8px;cursor:pointer;background:#fff}.file-button input{display:none}.source-textarea{min-height:360px;font-family:inherit;line-height:1.55}.builder-actions,.publish-bar{display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:14px;flex-wrap:wrap}.question-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}.worksheet-question{border:1px solid #e4e7ec;border-radius:12px;padding:16px;margin:12px 0}.worksheet-question textarea{min-height:80px}.question-controls{display:flex;gap:14px;align-items:flex-end}.question-controls label{flex:1}.option-editor{margin-top:8px}.option-editor>div{display:flex;gap:8px;margin:7px 0}.option-editor input{flex:1}.answer-toggle{border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:8px 10px;white-space:nowrap}.answer-toggle.on{background:#eef8f1;border-color:#8bc99d}.publish-bar{border-top:1px solid #eaecf0;padding-top:16px}.muted{color:#667085;font-size:13px;line-height:1.5}
@media(max-width:900px){.builder-grid{grid-template-columns:1fr}.builder-card{padding:16px}.question-controls{flex-direction:column;align-items:stretch}.question-controls label{width:100%}.builder-actions,.publish-bar{justify-content:stretch}.builder-actions button,.publish-bar button{flex:1}.source-textarea{min-height:280px}}
.worksheet-image-dropzone{min-height:180px;display:flex;flex-direction:column;justify-content:center;gap:7px;text-align:center;padding:18px;cursor:pointer}.worksheet-image-dropzone input{display:none}.worksheet-source-image{max-height:240px;max-width:100%;object-fit:contain;border-radius:10px}.worksheet-preview-image{display:block;max-width:360px;max-height:220px;object-fit:contain;border-radius:10px;margin-top:10px;border:1px solid #e5e7eb}.image-file-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;padding:9px 11px;background:#fafafa;border:1px solid #eee;border-radius:9px}

.publish-student-list{display:grid;gap:6px;max-height:320px;overflow:auto;margin-top:10px;border:1px solid #eee9e1;border-radius:10px;padding:8px}
.publish-student-row{display:flex;align-items:center;gap:10px;padding:8px 9px;border-radius:8px}
.publish-student-row:hover{background:#faf9f7}
.publish-student-row input{width:auto}
.publish-student-row small{color:#888;margin-left:auto}
.publish-toolbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:12px}
.publish-count{font-weight:700;color:#5b21b6}
.worksheet-template-header{background:#faf9f7;border:1px solid #e5dfd7;border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
.worksheet-template-header b{display:block;font-size:15px}
.worksheet-template-header .school-name{font-size:13px;color:#666;margin-bottom:4px}
.worksheet-template-header .student-line{color:#555;font-size:13px;margin-top:3px}
.font-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding:9px 11px;background:#f6f3ee;border-radius:10px}
.font-toolbar span{font-size:12px;color:#777;font-weight:700}
.font-toolbar button{border:1px solid #ddd7ce;background:#fff;border-radius:8px;padding:6px 10px;font-size:13px}
.font-toolbar button.active{background:#222;color:#fff;border-color:#222}
.checked-badge{display:inline-flex;align-items:center;gap:4px;color:#28623b;font-weight:700;font-size:12px}
`;


/* ===== Worksheet Workflow vFinal integration ===== */
const WORKSHEET_WORKER_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_WORKER_URL) ||
  "https://visual-art-ai.ymanng.workers.dev";

function worksheetLocalKey() {
  return "va_portfolio_worksheets_vfinal";
}

function readWorksheetStore(): Worksheet[] {
  try {
    const raw = localStorage.getItem(worksheetLocalKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeWorksheetStore(items: Worksheet[]) {
  localStorage.setItem(worksheetLocalKey(), JSON.stringify(items));
}

function saveWorksheetDraft(ws: Worksheet) {
  const items = readWorksheetStore();
  const next = items.some(x => x.id === ws.id)
    ? items.map(x => x.id === ws.id ? {...ws, updatedAt:new Date().toISOString()} : x)
    : [{...ws, updatedAt:new Date().toISOString()}, ...items];
  writeWorksheetStore(next);
  return next;
}

function publishWorksheetToTopic(ws: Worksheet, topicId: string) {
  const items = readWorksheetStore();
  const published = {...ws, topicId, status:"published" as const, updatedAt:new Date().toISOString()};
  const next = items.some(x => x.id === ws.id)
    ? items.map(x => x.id === ws.id ? published : x)
    : [published, ...items];
  writeWorksheetStore(next);
  return next;
}

function getWorksheetForStudent(id: string) {
  return readWorksheetStore().find(x => x.id === id && x.status === "published");
}




export default function App(){
  
  const [lang, setLang] = useState<Lang>(() => load("va_lang", "zh"));
const [role, setRole] = useState<Role | null>(() => load("va_role", null));
const [studentId, setStudentId] = useState<string | null>(() => load("va_student_id", null));
const [view, setView] = useState<View>(() => load("va_view", "home"));
  const [students,setStudents]=useState<Student[]>(()=>load("va_students",seedStudents));
  const [classes,setClasses]=useState<ClassItem[]>(()=>load("va_classes",seedClasses));
  const [topics,setTopics]=useState<Topic[]>(()=>load("va_topics",seedTopics));
  const [subs,setSubs]=useState<Submission[]>(()=>load("va_submissions",[]));
  const [worksheets,setWorksheets]=useState<Worksheet[]>(()=>load<any[]>("va_worksheets",[]).map((w:any)=>({...w,questions:rebalanceTo100(w.questions||[])})));
  const [teacherPassword,setTeacherPassword]=useState(TEACHER_PASSWORD);
  useEffect(() => {
    const fetchSubmissions = async () => {
      const { data, error } = await supabase.from('submissions').select('*');
      if (!error && data) {
        setSubs(data);
      }
    };

    fetchSubmissions();

    const channel = supabase
      .channel('realtime-submissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSubs((prev) => [payload.new as Submission, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSubs((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as Submission) : item))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  
  
  useEffect(() => localStorage.setItem("va_lang", JSON.stringify(lang)), [lang]);
useEffect(() => localStorage.setItem("va_role", JSON.stringify(role)), [role]);
useEffect(() => localStorage.setItem("va_student_id", JSON.stringify(studentId)), [studentId]);
useEffect(() => localStorage.setItem("va_view", JSON.stringify(view)), [view]);
  
  useEffect(()=>localStorage.setItem("va_students",JSON.stringify(students)),[students]);
  useEffect(()=>localStorage.setItem("va_classes",JSON.stringify(classes)),[classes]);
  useEffect(()=>localStorage.setItem("va_topics",JSON.stringify(topics)),[topics]);
  useEffect(()=>localStorage.setItem("va_submissions",JSON.stringify(subs)),[subs]);
  useEffect(()=>localStorage.setItem("va_worksheets",JSON.stringify(worksheets)),[worksheets]);
  const t=(zh:string,en:string)=>lang==="zh"?zh:en;
  const student=students.find(s=>s.id===studentId);
  const topicName=(x:Topic)=>lang==="zh"?x.nameZh:x.nameEn;
const logout = () => {
  setRole(null);
  setStudentId(null);
  setView("home");
  localStorage.removeItem("va_role");
  localStorage.removeItem("va_student_id");
  localStorage.removeItem("va_view");
};}

function LoginScreen({lang,setLang,students,classes,password,onStudent,onTeacher}:{lang:Lang;setLang:(x:Lang)=>void;students:Student[];classes:ClassItem[];password:string;onStudent:(id:string,l:Lang)=>void;onTeacher:(p:string)=>void}){
  const [classId,setClassId]=useState(classes[0]?.id||"2A");
  const [number,setNumber]=useState("");
  const [teacher,setTeacher]=useState(false);
  const [pw,setPw]=useState("");
  const t=(zh:string,en:string)=>lang==="zh"?zh:en;
  const loginStudent=()=>{
    const s=students.find(x=>x.classId===classId&&x.number===number&&x.status!=="withdrawn");
    if(!s){alert(t("找不到學生資料，請檢查班別及學號。","Student not found. Please check class and student number."));return;}
    onStudent(s.id,s.language);
  };
  return <div className="login-page">
    <div className="login-card">
      <h1>地利亞修女紀念學校 (協和二中) Delia Memorial School (Hip Wo No.2 College)</h1><p className="login-department">視覺藝術科 · Visual Arts Department</p>
      <p>{t("視覺藝術作品記錄及評分系統","Visual Arts Portfolio & Assessment")}</p>
      <div className="language-row">
        <button className={lang==="zh"?"active":""} onClick={()=>setLang("zh")}>中文</button>
        <button className={lang==="en"?"active":""} onClick={()=>setLang("en")}>English</button>
      </div>
      {!teacher ? <>
        <label>{t("班別","Class")}</label>
        <select value={classId} onChange={e=>setClassId(e.target.value)}>{classes.map(c=><option key={c.id}>{c.id}</option>)}</select>
        <label>{t("學號","Student Number")}</label>
        <input value={number} onChange={e=>setNumber(e.target.value)} placeholder={t("例如 12","e.g. 12")} />
        <button className="primary wide" onClick={loginStudent}>{t("學生登入","Student Login")}</button>
        <button className="link-button" onClick={()=>setTeacher(true)}><ShieldCheck size={16}/>{t("教師入口","Teacher Login")}</button>
      </>:<>
        <label>{t("教師密碼","Teacher Password")}</label>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onTeacher(pw)} />
        <button className="primary wide" onClick={()=>onTeacher(pw)}>{t("教師登入","Teacher Login")}</button>
        <button className="link-button" onClick={()=>setTeacher(false)}>{t("返回學生登入","Back to Student Login")}</button>
      </>}
      <div className="notice"><Languages size={16}/>{t("學生登入後會顯示姓名、班別及學號，確認無誤才開始使用。","After login, students see their name, class and number to confirm their account.")}</div>
    </div>
  </div>
}

function StudentApp(p:any){
  const {student,lang,setLang,view,setView,topics,subs,setSubs,classes,worksheets,topicName,t,logout}=p;
  const myTopics=topics.filter((x:Topic)=>x.classIds.includes(student.classId));
  const mySubs=subs.filter((x:Submission)=>x.studentId===student.id);
  const statusText=student.status==="active"?t("正常上課","Active"):student.status==="longAbsence"?t("暫時長期缺席","Long Absence"):t("畢業／離校","Graduated / Withdrawn");
  const latestFor=(topicId:string)=>mySubs.filter((s:Submission)=>s.topicId===topicId).sort((a:Submission,b:Submission)=>b.version-a.version)[0];
  const [selectedSubmissionId,setSelectedSubmissionId]=useState<string|null>(null);
  const selectedSubmission=mySubs.find((s:Submission)=>s.id===selectedSubmissionId)||null;
  const selectedTopic=selectedSubmission?myTopics.find((x:Topic)=>x.id===selectedSubmission.topicId):null;
  const selectedWorksheet=selectedSubmission&&selectedTopic?.rubricId==="worksheet"
  ? worksheets.find((w:Worksheet)=>w.id===selectedTopic.worksheetId)
  : null;
  return <div className="app">
    <header className="topbar">
      <div className="brand"><div><b>{t("地利亞修女紀念學校 (協和二中)","Delia Memorial School (Hip Wo No.2 College)")}</b><small>{t("視覺藝術科 · 學生作品平台","Visual Arts Department · Student Portfolio")}</small></div></div>
      <div className="top-actions"><div className="language-row compact"><button className={lang==="zh"?"active":""} onClick={()=>setLang("zh")}>中文</button><button className={lang==="en"?"active":""} onClick={()=>setLang("en")}>EN</button></div><button className="icon-btn" onClick={logout} title={t("登出","Log out")}><LogOut size={17}/></button></div>
    </header>
    <nav className="student-nav">
      <button className={view==="home"?"active":""} onClick={()=>setView("home")}>{t("首頁","Home")}</button>
      <button className={view==="portfolio"?"active":""} onClick={()=>setView("portfolio")}>{t("作品紀錄","Portfolio Records")}</button>
      <button className="upload-nav" onClick={()=>setView("upload")}><Camera size={16}/>{t("提交作品","Submit Artwork")}</button><button className={view==="studentWorksheet"?"active":""} onClick={()=>setView("studentWorksheet")}>{t("工作紙","Worksheets")}</button>
      <button className={view==="feedback"?"active":""} onClick={()=>setView("feedback")}>{t("教師評語","Teacher Feedback")}</button>
    </nav>
    <main className="main">
      {view==="home"&&<div>
        <section className="hero"><div><p className="eyebrow">{t("視覺藝術作品集","VISUAL ARTS PORTFOLIO")}</p><h1>{t(`你好，${student.name.split(" ")[0]}`,`Welcome, ${student.name.split(" ")[0]}`)}</h1><p>{student.classId} · No.{student.number} · {statusText}</p></div><button className="primary big" onClick={()=>setView("upload")}><Camera size={18}/>{t("提交作品","Submit Artwork")}</button></section>
        <div className="stats"><div className="stat"><BookOpen/><b>{myTopics.length}</b><small>{t("課題","Topics")}</small></div><div className="stat"><Check/><b>{mySubs.length}</b><small>{t("已提交","Submitted")}</small></div><div className="stat"><Clipboard/><b>{mySubs.filter((s:Submission)=>s.status==="assessed").length}</b><small>{t("已評核","Assessed")}</small></div><div className="stat"><GraduationCap/><b>{mySubs.filter((s:Submission)=>s.status==="assessed").length?Math.round(mySubs.filter((s:Submission)=>s.status==="assessed").reduce((a:number,s:Submission)=>a+(s.marks?.reduce((x,y)=>x+y,0)||0),0)/mySubs.filter((s:Submission)=>s.status==="assessed").length):"—"}</b><small>{t("平均分","Average")}</small></div></div>
        <div className="section-head"><div><h2>{t("我的課題","My Topics")}</h2><p>{t("按課題查看提交狀態；按作品可查看完整評核結果","Select a topic to view your submission; open an artwork to view the full assessment")}</p></div></div>
        <TopicTable {...{myTopics,latestFor,topicName,t,onOpenSubmission:(id:string)=>setSelectedSubmissionId(id)}} />
      </div>}
      {view==="portfolio"&&<div><PageTitle title={t("作品紀錄","Portfolio Records")} sub={t("查看各課題的作品、提交日期、分數及評核日期","View artwork, submission date, marks and assessment date for each topic")}/><TopicTable {...{myTopics,latestFor,topicName,t,onOpenSubmission:(id:string)=>setSelectedSubmissionId(id)}} /></div>}
      {view==="feedback"&&<FeedbackView {...{mySubs,myTopics,topicName,t,onOpenSubmission:(id:string)=>setSelectedSubmissionId(id)}}/>}
      {view==="upload"&&<UploadView {...{student,myTopics,latestFor,topicName,t,subs,setSubs,setView}}/>}
      {view==="studentWorksheet"&&<StudentWorksheetView {...{student,myTopics,worksheets,topicName,t,subs,setSubs,setView}}/>}
    </main>
    {selectedSubmission&&selectedTopic&&(selectedWorksheet
  ? <StudentWorksheetReview ws={selectedWorksheet} sub={selectedSubmission} t={t} onClose={()=>setSelectedSubmissionId(null)}/>
  : <SubmissionReviewModal sub={selectedSubmission} topic={selectedTopic} t={t} onClose={()=>setSelectedSubmissionId(null)}/>
)} 
  </div>
}

function StudentWorksheetView({student,myTopics,worksheets,topicName,t,subs,setSubs,setView}:any){
  const published=worksheets.filter((w:Worksheet)=>w.status==="published"&&(w.studentIds?.length?w.studentIds.includes(student.id):w.classIds.includes(student.classId)));
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [reviewId,setReviewId]=useState<string|null>(null);
  const [fontFamily,setFontFamily]=useState<string>(()=>localStorage.getItem("va_student_font")||"default");
  const [fontSize,setFontSize]=useState<string>(()=>localStorage.getItem("va_student_fontsize")||"m");
  useEffect(()=>localStorage.setItem("va_student_font",fontFamily),[fontFamily]);
  useEffect(()=>localStorage.setItem("va_student_fontsize",fontSize),[fontSize]);
  const fontStacks:Record<string,string>={
    default:"Inter,-apple-system,BlinkMacSystemFont,\"Segoe UI\",\"PingFang TC\",\"Microsoft JhengHei\",sans-serif",
    rounded:"\"Varela Round\",\"Helvetica Rounded\",\"PingFang TC\",\"Microsoft JhengHei\",sans-serif",
    serif:"Georgia,\"Noto Serif TC\",\"PMingLiU\",serif",
    mono:"\"Courier New\",\"Cascadia Mono\",monospace"
  };
  const sizeMap:Record<string,string>={s:"14px",m:"17px",l:"20px"};
  const modalStyle={fontFamily:fontStacks[fontFamily],fontSize:sizeMap[fontSize]};
  const ws=published.find((w:Worksheet)=>w.id===selectedId)||null;
  const reviewSub=reviewId?subs.find((s:Submission)=>s.id===reviewId)||null:null;
  const review=reviewSub?published.find((w:Worksheet)=>w.id===reviewSub.worksheetId)||null:null;
  useEffect(()=>{if(ws)setAnswers({})},[selectedId]);
  const total=ws?.questions.reduce((a,q)=>a+q.points,0)||0;
  const isCorrect=(q:WorksheetQuestion,a:string)=>{
    if(q.type==="short") return null;
    const v=a.trim().toLowerCase();
    const accepted=(q.acceptedAnswers?.length?q.acceptedAnswers:[q.answer].flat().filter(Boolean) as string[]).map(x=>String(x).trim().toLowerCase());
    return accepted.includes(v);
  };
  const submit=()=>{
    if(!ws||!ws.topicId)return;
    const missing=ws.questions.filter(q=>q.type!=="short"&&!answers[q.id]?.trim());
    if(missing.length){alert(t("請完成所有選擇題及填充題。","Please complete all MCQ and fill-in questions first."));return;}
    const marks=ws.questions.map(q=>isCorrect(q,answers[q.id]||"")===true?q.points:0);
    const score=marks.reduce((a,b)=>a+b,0);
    const previous=subs.filter((s:Submission)=>s.studentId===student.id&&s.worksheetId===ws.id).sort((a:Submission,b:Submission)=>b.version-a.version)[0];
    const item:Submission={id:`ws-sub-${Date.now()}`,studentId:student.id,topicId:ws.topicId,image:"",uploadedAt:now(),version:(previous?.version||0)+1,status:"assessed",answers:{...answers},worksheetId:ws.id,marks,autoScore:score,assessedAt:now(),comment:""};
    setSubs([...subs.filter((s:Submission)=>!(s.studentId===student.id&&s.worksheetId===ws.id)),item]);
    setReviewId(item.id);
    alert(t(`已提交工作紙，得分 ${score}/${total}。`,`Worksheet submitted. Score: ${score}/${total}.`));
  };
  return <div className="narrow"><button className="back" onClick={()=>setView("home")}><ChevronLeft size={17}/>{t("返回","Back")}</button>
    <PageTitle title={t("我的工作紙","My Worksheets")} sub={t("完成後可以再次查看自己的答案、錯題及正確答案。","After submission, you can review your answers, mistakes and correct answers.")}/>
    {!published.length?<div className="empty"><BookOpen size={35}/><h3>{t("目前沒有已發布工作紙","No published worksheets")}</h3></div>:
    <div className="table-card">{published.map((w:Worksheet)=>{const sub=subs.filter((x:Submission)=>x.studentId===student.id&&x.worksheetId===w.id).sort((a:Submission,b:Submission)=>b.version-a.version)[0];return <div className="table-row" key={w.id}><button className="clickable-row" onClick={()=>setSelectedId(w.id)}><b>{t(w.titleZh,w.titleEn)}</b><small>{w.questions.length} {t("題","questions")} · 100 {t("分","points")}</small></button><span>{sub?`${sub.autoScore??0}/100`:t("未完成","Not started")}</span><button className="outline small" onClick={()=>sub&&setReviewId(sub.id)} disabled={!sub}>{t("查看作答","Review")}</button></div>})}</div>}
    {ws&&<Modal title={t(ws.titleZh,ws.titleEn)} onClose={()=>setSelectedId(null)}><div className="review-modal-content" style={modalStyle}>
      <div className="worksheet-template-header"><div><div className="school-name">{t("地利亞修女紀念學校 (協和二中) · 視覺藝術科","Delia Memorial School (Hip Wo No.2 College) · Visual Arts")}</div><b>{t(ws.titleZh,ws.titleEn)}</b></div><div className="student-line"><div>{t("姓名","Name")}: <b>{student.name}</b></div><div>{t("班別","Class")}: <b>{student.classId}</b> {t("學號","No.")}: <b>{student.number}</b></div><div>{t("日期","Date")}: {dateText(now())}</div></div></div>
      <div className="font-toolbar"><span>{t("字體","Font")}</span><button className={fontFamily==="default"?"active":""} onClick={()=>setFontFamily("default")}>{t("預設","Default")}</button><button className={fontFamily==="rounded"?"active":""} onClick={()=>setFontFamily("rounded")}>{t("圓體","Rounded")}</button><button className={fontFamily==="serif"?"active":""} onClick={()=>setFontFamily("serif")}>{t("宋體","Serif")}</button><button className={fontFamily==="mono"?"active":""} onClick={()=>setFontFamily("mono")}>{t("等寬","Mono")}</button><span>{t("大小","Size")}</span><button className={fontSize==="s"?"active":""} onClick={()=>setFontSize("s")}>A-</button><button className={fontSize==="m"?"active":""} onClick={()=>setFontSize("m")}>A</button><button className={fontSize==="l"?"active":""} onClick={()=>setFontSize("l")}>A+</button></div>
      {ws.sourceImage&&<img className="worksheet-source-image" src={ws.sourceImage} alt="" />}
      {ws.questions.map((q:WorksheetQuestion,i:number)=><div className="worksheet-question" key={q.id}><div className="question-head"><b>{i+1}. {q.type==="mc"?t("選擇題","Multiple Choice"):q.type==="fill"?t("填充題","Fill in the Blank"):t("短答題","Short Answer")}</b><span>{q.points} {t("分","pts")}</span></div><h3>{q.question}</h3>{q.questionEn&&<p className="muted">{q.questionEn}</p>}{q.options&&<div className="answer-options">{q.options.map(o=><label key={o.label}><input type="radio" name={q.id} checked={answers[q.id]===o.label} onChange={()=>setAnswers({...answers,[q.id]:o.label})}/><b>{o.label}</b> {o.zh}{o.en?` / ${o.en}`:""}</label>)}</div>}{q.type==="fill"&&<input value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})} placeholder={t("輸入答案…","Type your answer…")}/>} {q.type==="short"&&<textarea value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})} placeholder={t("請輸入答案…","Type your answer…")}/>}</div>)}<div className="publish-bar"><button className="primary" onClick={submit}>{t("提交工作紙","Submit Worksheet")}</button></div></div></Modal>}
    {reviewSub&&review&&<StudentWorksheetReview ws={review} sub={reviewSub} t={t} onClose={()=>setReviewId(null)}/>}
  </div>;
  
}

function StudentWorksheetReview({ws,sub,t,onClose}:any){
  const answers=sub.answers||{};
  const score=sub.autoScore??0;
  const correct=(q:WorksheetQuestion)=>{if(q.type==="short")return null;const a=String(answers[q.id]||"").trim().toLowerCase();const acc=(q.acceptedAnswers?.length?q.acceptedAnswers:[q.answer].flat().filter(Boolean) as string[]).map(x=>String(x).trim().toLowerCase());return acc.includes(a)};
  return <Modal title={t("作答結果","Submission Review")} onClose={onClose}><div className="review-modal-content"><div className="review-result-score"><b>{score}</b><span>/100</span></div>{ws.questions.map((q:WorksheetQuestion,i:number)=>{const ok=correct(q);return <div className="worksheet-question" key={q.id}><div className="question-head"><b>{i+1}. {q.type==="mc"?t("選擇題","Multiple Choice"):q.type==="fill"?t("填充題","Fill in the Blank"):t("短答題","Short Answer")}</b>{ok===null?<span>{t("待老師批改","Teacher review")}</span>:ok?<span>✓ {t("正確","Correct")}</span>:<span>✗ {t("錯誤","Incorrect")}</span>}</div><h3>{q.question}</h3><p><b>{t("你的答案","Your answer")}:</b> {answers[q.id]||t("沒有作答","No answer")}</p>{ok===false&&<p><b>{t("正確答案","Correct answer")}:</b> {Array.isArray(q.answer)?q.answer.join(" / "):q.answer}</p>}{q.explanation&&<p className="muted">{q.explanation}</p>}</div>})}</div></Modal>;
}

function TopicTable({myTopics,latestFor,topicName,t,onOpenSubmission}:any){
  return <div className="table-card"><div className="table-head"><span>{t("課題","Topic")}</span><span>{t("提交日期","Submission Date")}</span><span>{t("分數","Marks")}</span><span>{t("評核日期","Assessment Date")}</span></div>
    {myTopics.map((topic:Topic)=>{
      const s=latestFor(topic.id); const total=s?.marks?.reduce((a:number,b:number)=>a+b,0);
      return <button className={`table-row clickable-row ${s?"":"no-submission-row"}`} key={topic.id} disabled={!s} onClick={()=>s&&onOpenSubmission(s.id)}><div><b>{topicName(topic)}</b><small>{t("提交要求","Required submissions")}: {topic.submissions}</small></div><div>{s?dateText(s.uploadedAt):t("尚未提交","Not submitted")}</div><div>{total!==undefined?<strong className="score">{total}/100</strong>:<span className="pending-text">{t("待評核","Awaiting assessment")}</span>}</div><div>{s?.assessedAt?dateText(s.assessedAt):"—"}</div></button>
    })}
  </div>
}

function UploadView({student,myTopics,latestFor,topicName,t,subs,setSubs,setView}:any){
  const [topicId,setTopicId]=useState(myTopics[0]?.id||""); const [slot,setSlot]=useState(1); const [preview,setPreview]=useState<string|null>(null); const [fileName,setFileName]=useState("");
  const topic=myTopics.find((x:Topic)=>x.id===topicId); const existing=topic?subs.filter((s:Submission)=>s.studentId===student.id&&s.topicId===topic.id):[];
  const assessed=existing.some((s:Submission)=>s.status==="assessed");
  const canUpload=topic && !assessed && existing.length<topic.submissions;
  const choose=(e:any)=>{const f=e.target.files?.[0];if(!f)return;setFileName(f.name);const r=new FileReader();r.onload=()=>setPreview(String(r.result));r.readAsDataURL(f)};
  const submit=()=>{if(!preview||!topic)return;const v=existing.length+1;setSubs([...subs,{id:`sub-${Date.now()}`,studentId:student.id,topicId:topic.id,image:preview,uploadedAt:now(),version:v,status:"submitted"}]);setPreview(null);setFileName("");alert(t("作品已提交！","Artwork submitted!"));};
  const removeLast=()=>{if(!topic)return;const last=[...existing].sort((a,b)=>b.version-a.version)[0];if(!last||last.status==="assessed")return;setSubs(subs.filter((s:Submission)=>s.id!==last.id));alert(t("已刪除，可以重新提交。","Deleted. You can resubmit now."));};
  return <div className="narrow"><button className="back" onClick={()=>setView("home")}><ChevronLeft size={17}/>{t("返回","Back")}</button><PageTitle title={t("提交作品","Submit Artwork")} sub={t("按課題要求提交指定數量的作品","Submit the required number of artworks for this topic")}/>
    <div className="form-card"><label>{t("選擇課題","Select Topic")}</label><select value={topicId} onChange={e=>{setTopicId(e.target.value);setPreview(null)}}>{myTopics.map((x:Topic)=><option key={x.id} value={x.id}>{topicName(x)} · {x.submissions} {t("份","submission(s)")}</option>)}</select>
      {topic&&<div className="submission-info"><b>{t("提交進度","Submission progress")}: {existing.length}/{topic.submissions}</b>{existing.length>0&&<div className="slot-row">{existing.map((s:Submission)=><span className="slot" key={s.id}><Check size={13}/> {t("作品","Artwork")} {s.version}</span>)}</div>}</div>}
      {assessed&&<div className="warning"><ShieldCheck size={17}/>{t("此作品已評分，學生不能自行刪除。請老師使用 Allow Resubmission。","This submission has been assessed. Contact the teacher to allow resubmission.")}</div>}
      {!assessed&&existing.length>0&&<button className="outline" onClick={removeLast}><Trash2 size={16}/>{t("刪除最近一次提交並重新提交","Delete latest & Resubmit")}</button>}
      {canUpload&&<><label>{t("作品照片","Artwork Photo")}</label><label className="dropzone"><input type="file" accept="image/*" capture="environment" onChange={choose}/>{preview?<img src={preview} className="upload-preview"/>:<><Camera size={42}/><b>{t("拍照或選擇照片","Take a photo or choose an image")}</b><span>{t("手機可以直接使用相機","On mobile, you can use the camera directly")}</span></>}</label>{fileName&&<p className="muted">{fileName}</p>}<button className="primary wide" disabled={!preview} onClick={submit}><Upload size={17}/>{t("提交作品","Submit Artwork")}</button></>}
      {!canUpload&&!assessed&&<div className="success"><Check size={30}/><h3>{t("已完成提交","Submission complete")}</h3><p>{t("這個課題已達到要求數量。","This Topic has reached its required number of submissions.")}</p></div>}
    </div>
  </div>
}

function FeedbackView({mySubs,myTopics,topicName,t,onOpenSubmission}:any){
  const assessed=mySubs
  .filter((s:Submission)=>s.status==="assessed")
  .filter((s:Submission)=>myTopics.some((topic:Topic)=>topic.id===s.topicId))
  .sort((a:Submission,b:Submission)=>b.assessedAt?.localeCompare(a.assessedAt||"")||0);

  return <div>
    <PageTitle
      title={t("教師評語","Teacher Feedback")}
      sub={t("查看作品、分項評核、評語及改善建議","View artwork, assessment criteria, comments and areas for improvement")}
    />
    {assessed.length
      ? <div className="feedback-list">
          {assessed.map((s:Submission)=>{
            const topic=myTopics.find((x:Topic)=>x.id===s.topicId);
            const total=s.marks?.reduce((a:number,b:number)=>a+b,0)||0;

            return <button
              className="feedback-item"
              key={s.id}
              onClick={()=>onOpenSubmission(s.id)}
            >
              <img src={s.image}/>
              <div>
                <b>{topic?topicName(topic):""}</b>
                <small>{s.assessedAt&&dateText(s.assessedAt)}</small>
                <p>
                  {[...(s.feedbackGood||[]),...(s.feedbackImprove||[])].length
                    ? t("已記錄優點及改善方向","Strengths and areas for improvement recorded")
                    : t("已完成評核","Assessment completed")}
                </p>
              </div>
              <strong>{total}/100</strong>
              <ChevronRight/>
            </button>
          })}
        </div>
      : <div className="empty">
          <BookOpen size={35}/>
          <h3>{t("暫時沒有已評核作品","No assessed artworks yet")}</h3>
        </div>
    }
  </div>
}

function SubmissionReviewModal({sub,topic,t,onClose}:any){
  const total=sub.marks?.reduce((a:number,b:number)=>a+b,0)||0;

  return <Modal title={t("作品評核結果","Assessment Result")} onClose={onClose}>
    <div className="review-modal-content">
      <img className="review-image" src={sub.image}/>
      <div className="review-result-score">
        <b>{total}</b><span>/100</span>
      </div>
      <h3>{topic.nameZh}</h3>
      <p className="muted">
        {topic.nameEn} · {t("提交","Submitted")} {dateText(sub.uploadedAt)} · Version {sub.version}
      </p>
      <div className="review-criteria-list">
        {rubric.map((r:any,i:number)=>{
          const mark=sub.marks?.[i]||0;
          const level=levelForMark(mark);
          const lv=r.levels.find((x:any)=>x[0]===level);

          return <div className="review-criteria-item" key={r.id}>
            <div>
              <b>{i+1}. {langLabel(r,t)}</b>
              <span>{t(lv?.[0]||"0",lv?.[1]||"0")} · {mark}/25</span>
            </div>
            {lv?.[2]&&<p>{lv[2]}</p>}
          </div>
        })}
      </div>
      <div className="feedback-summary">
        <h4>{t("優點","Strengths")}</h4>
        <p>{(sub.feedbackGood||[]).map((id:string)=>{
          const o=goodOptions.find((x:any)=>x[0]===id);
          return o?t(o[2],o[1]):"";
        }).filter(Boolean).join("；")||t("沒有額外記錄","No additional strengths recorded")}</p>

        <h4>{t("改善方向","Areas for Improvement")}</h4>
        <p>{(sub.feedbackImprove||[]).map((id:string)=>{
          const o=improveOptions.find((x:any)=>x[0]===id);
          return o?t(o[2],o[1]):"";
        }).filter(Boolean).join("；")||t("沒有額外建議","No additional improvement suggestions")}</p>

        <h4>{t("教師評語","Teacher Comment")}</h4>
        <p>{sub.comment||t("沒有補充評語","No additional comment")}</p>
      </div>
    </div>
  </Modal>
}

function TeacherApp(p:any){
  const {lang,setLang,view,setView,students,setStudents,classes,setClasses,topics,setTopics,subs,setSubs,worksheets,setWorksheets,topicName,t,logout}=p; const [selectedStudentId,setSelectedStudentId]=useState<string|null>(null);
  const openStudent=(id:string)=>{setSelectedStudentId(id);setView("book")};
  return <div className="app"><header className="topbar"><div className="brand"><div><b>{t("地利亞修女紀念學校 (協和二中)","Delia Memorial School (Hip Wo No.2 College)")}</b><small>{t("視覺藝術科 · 教師管理平台","Visual Arts Department · Teacher Management")}</small></div></div><div className="top-actions"><div className="language-row compact"><button className={lang==="zh"?"active":""} onClick={()=>setLang("zh")}>中文</button><button className={lang==="en"?"active":""} onClick={()=>setLang("en")}>EN</button></div><span className="teacher-badge"><ShieldCheck size={15}/>{t("教師","Teacher")}</span><button className="icon-btn" onClick={logout}><LogOut size={17}/></button></div></header>
    <div className="teacher-layout"><aside className="sidebar">{[["dashboard",t("總覽","Overview"),Clipboard],["students",t("學生管理","Students"),Users],["topics",t("課題管理","Topics"),BookOpen],["assessment",t("評核","Assessment"),Check],["book",t("學生作品紀錄","Portfolio Records"),BookOpen],["grades",t("成績","Grades"),Copy],["worksheetLibrary",t("工作紙管理","Worksheet Management"),BookOpen],["aiWorksheet",t("AI 建立工作紙","AI Worksheet"),Edit3]].map(([id,label,I]:any)=><button key={id} className={view===id?"active":""} onClick={()=>setView(id)}><I size={17}/>{label}</button>)}</aside><main className="main teacher-main">
      {view==="dashboard"&&<Dashboard {...{students,classes,topics,subs,t,setView}}/>}{view==="students"&&<StudentsView {...{students,setStudents,classes,setClasses,topics,setTopics,t,onOpenStudent:openStudent}}/>}{view==="topics"&&<TopicsView {...{topics,setTopics,classes,students,worksheets,setWorksheets,t}}/>}{view==="assessment"&&<AssessmentView {...{students,classes,topics,subs,setSubs,t,topicName}}/>}{view==="book"&&<BookView {...{students,classes,topics,subs,setSubs,worksheets,t,topicName,initialStudentId:selectedStudentId}}/>}{view==="grades"&&<GradesView {...{students,classes,topics,subs,t,topicName}}/>}{view==="worksheetLibrary"&&<WorksheetLibrary {...{worksheets,setWorksheets,topics,setTopics,classes,students,t}}/>}{view==="aiWorksheet"&&<WorksheetBuilder {...{worksheets,setWorksheets,classes,t}}/>}
    </main></div></div>
}

function Dashboard({students,classes,topics,subs,t,setView}:any){
  const assessed=subs.filter((x:Submission)=>x.status==="assessed").length; const pending=subs.filter((x:Submission)=>x.status==="submitted").length;
  const byClass=classes.map((c:ClassItem)=>({c,n:students.filter((s:Student)=>s.classId===c.id).length,p:subs.filter((q:Submission)=>{const st=students.find((x:Student)=>x.id===q.studentId);return st?.classId===c.id&&q.status==="submitted"}).length}));
  return <><PageTitle title={t("教師總覽","Teacher Overview")} sub={t("查看各班學生、課題及評核進度","Monitor students, topics and assessment progress")}/>
    <div className="stats"><button className="stat" onClick={()=>setView("students")}><Users/><b>{students.filter((s:Student)=>s.status!=="withdrawn").length}</b><small>{t("學生","Students")}</small></button><button className="stat" onClick={()=>setView("topics")}><BookOpen/><b>{topics.length}</b><small>{t("課題","Topics")}</small></button><button className="stat" onClick={()=>setView("assessment")}><Clipboard/><b>{pending}</b><small>{t("待評核作品","Pending")}</small></button><button className="stat" onClick={()=>setView("book")}><Check/><b>{assessed}</b><small>{t("已完成評核","Assessed")}</small></button></div>
    <div className="table-card"><div className="table-head"><span>{t("班別","Class")}</span><span>{t("學生","Students")}</span><span>{t("待評核","Pending")}</span><span>{t("操作","Open")}</span></div>{byClass.map((x:any)=><div className="table-row" key={x.c.id}><span><b>{x.c.id}</b></span><span>{x.n}</span><span>{x.p}</span><button className="outline small" onClick={()=>setView("assessment")}>{t("進入評核","Open Assessment")}</button></div>)}</div>
  </>
}

function StudentsView({students,setStudents,classes,setClasses,topics,setTopics,t,onOpenStudent}:any){
  const [editing,setEditing]=useState<Student|null>(null); const [adding,setAdding]=useState(false); const [classModal,setClassModal]=useState<"add"|"edit"|null>(null);
  const [classId,setClassId]=useState(classes[0]?.id||""); const [filter,setFilter]=useState("all");
  const selectedClass=classes.find((c:ClassItem)=>c.id===classId);
  const shown=students.filter((s:Student)=>s.classId===classId&&(filter==="all"||s.status===filter)).sort((a:Student,b:Student)=>Number(a.number)-Number(b.number));
  const save=(x:Student)=>{setStudents(students.some((s:Student)=>s.id===x.id)?students.map((s:Student)=>s.id===x.id?x:s):[...students,x]);setEditing(null);setAdding(false)};
  const saveClass=(x:ClassItem,isNew:boolean)=>{const clean=x.id.trim();if(!clean){alert(t("請輸入班別名稱。","Please enter a class name."));return}if(classes.some((c:ClassItem)=>c.id===clean&&(!isNew||c.id!==selectedClass?.id))){alert(t("這個班別已經存在。","This class already exists."));return}if(isNew){setClasses([...classes,{id:clean,name:clean,language:x.language}]);setClassId(clean)}else if(selectedClass){const old=selectedClass.id;setClasses(classes.map((c:ClassItem)=>c.id===old?{...c,id:clean,name:clean,language:x.language}:c));setStudents(students.map((st:Student)=>st.classId===old?{...st,classId:clean}:st));setTopics(topics.map((tp:Topic)=>tp.classIds.includes(old)?{...tp,classIds:tp.classIds.map((id:string)=>id===old?clean:id)}:tp));setClassId(clean)}setClassModal(null)};
  const deleteClass=()=>{if(!selectedClass)return;const hasStudents=students.some((s:Student)=>s.classId===selectedClass.id);if(hasStudents){alert(t("此班別仍有學生，不能直接刪除。請先把學生轉到其他班別。","This class still has students and cannot be deleted. Move the students to another class first."));return}const affectedTopics=topics.filter((x:Topic)=>x.classIds.includes(selectedClass.id));if(confirm(t(`確定刪除班別「${selectedClass.id}」？相關課題的班別設定亦會一併移除。此操作不能復原。`,`Delete class “${selectedClass.id}”? The class assignment for related topics will also be removed. This action cannot be undone.`))){const next=classes.filter((c:ClassItem)=>c.id!==selectedClass.id);setClasses(next);setTopics(topics.map((tp:Topic)=>tp.classIds.includes(selectedClass.id)?{...tp,classIds:tp.classIds.filter((id:string)=>id!==selectedClass.id)}:tp));setClassId(next[0]?.id||"")}};
  return <><PageTitle title={t("學生管理","Student Management")} sub={t("先選班別，再管理學生資料；可修改班別及學生狀態","Select a class first, then manage student records, class settings and student status")} action={<><button className="outline" onClick={()=>setClassModal("add")}><Plus size={16}/>{t("新增班別","Add Class")}</button><button className="primary" onClick={()=>setAdding(true)} disabled={!classes.length}><UserPlus size={16}/>{t("新增學生","Add Student")}</button></>}/>
    <div className="class-tabs">{classes.map((c:ClassItem)=><button key={c.id} className={classId===c.id?"selected":""} onClick={()=>{setClassId(c.id);setFilter("all")}}>{c.id}<small>{students.filter((s:Student)=>s.classId===c.id).length} {t("人","students")}</small></button>)}</div>
    {selectedClass&&<div className="class-settings-bar"><div><b>{t("目前班別","Current class")}: {selectedClass.id}</b><span>{students.filter((s:Student)=>s.classId===selectedClass.id).length} {t("名學生","students")}</span></div><div className="row-actions"><button className="outline small" onClick={()=>setClassModal("edit")}><Edit3 size={14}/>{t("修改班別","Edit Class")}</button><button className="outline small danger" onClick={deleteClass}><Trash2 size={14}/>{t("刪除班別","Delete Class")}</button></div></div>}
    <div className="filter-row">{[["all",t("全部","All")],["active",t("正常上課","Active")],["longAbsence",t("暫時長期缺席","Long Absence")],["withdrawn",t("畢業／離校","Graduated / Withdrawn")]].map(([id,l])=><button className={filter===id?"selected":""} onClick={()=>setFilter(id)} key={id}>{l}</button>)}</div>
    <div className="table-card"><div className="table-head"><span>{t("學生","Student")}</span><span>{t("狀態","Status")}</span><span>{t("語言","Language")}</span><span></span></div>
      {shown.map((st:Student)=><div className="table-row student-row" key={st.id}><button className="name-link" onClick={()=>onOpenStudent(st.id)}><b>{st.name}</b><small>{st.classId} · No.{st.number}</small></button><div><Status status={st.status} t={t}/></div><div>{st.language==="zh"?t("中文","Chinese"):t("英文","English")}</div><button className="outline small" onClick={()=>setEditing(st)}><Edit3 size={14}/>{t("修改","Edit")}</button></div>)}
    </div>
    {(editing||adding)&&<StudentModal student={editing||{id:`s-${Date.now()}`,name:"",classId:classId||classes[0]?.id||"",number:"",language:"zh",status:"active",year:"2026-27"}} classes={classes} t={t} onSave={save} onClose={()=>{setEditing(null);setAdding(false)}}/>}
    {classModal&&<ClassModal mode={classModal} classItem={classModal==="edit"?selectedClass:{id:"",name:"",language:"zh"}} t={t} onSave={saveClass} onClose={()=>setClassModal(null)}/>} 
  </>
}

function StudentModal({student,classes,t,onSave,onClose}:any){
  const [x,setX]=useState({...student});
  return <Modal title={student.name?t("修改學生資料","Edit Student Record"):t("新增學生","Add Student")} onClose={onClose}><label>{t("姓名","Name")}</label><input value={x.name} onChange={e=>setX({...x,name:e.target.value})}/><label>{t("班別","Class")}</label><select value={x.classId} onChange={e=>setX({...x,classId:e.target.value})}>{classes.map((c:ClassItem)=><option key={c.id}>{c.id}</option>)}</select><label>{t("學號","Student Number")}</label><input value={x.number} onChange={e=>setX({...x,number:e.target.value})}/><label>{t("語言","Language")}</label><select value={x.language} onChange={e=>setX({...x,language:e.target.value})}><option value="zh">{t("中文","Chinese")}</option><option value="en">{t("英文","English")}</option></select><label>{t("學生狀態","Student Status")}</label><select value={x.status} onChange={e=>setX({...x,status:e.target.value})}><option value="active">{t("正常上課","Active")}</option><option value="longAbsence">{t("暫時長期缺席","Long Absence")}</option><option value="withdrawn">{t("畢業／離校","Graduated / Withdrawn")}</option></select><div className="modal-actions"><button className="outline" onClick={onClose}>{t("取消","Cancel")}</button><button className="primary" onClick={()=>onSave(x)}>{t("儲存","Save")}</button></div></Modal>
}

function ClassModal({mode,classItem,t,onSave,onClose}:any){
  const [x,setX]=useState({...classItem});
  return <Modal title={mode==="edit"?t("修改班別","Edit Class"):t("新增班別","Add Class")} onClose={onClose}><label>{t("班別名稱","Class Name")}</label><input autoFocus value={x.id} onChange={e=>setX({...x,id:e.target.value,name:e.target.value})} placeholder={t("例如：2A","e.g. 2A")}/><div className="modal-actions"><button className="outline" onClick={onClose}>{t("取消","Cancel")}</button><button className="primary" onClick={()=>onSave(x,mode==="add")}>{t("儲存","Save")}</button></div></Modal>
}

function TopicsView({topics,setTopics,classes,students,worksheets,setWorksheets,t}:any){
  const [classId,setClassId]=useState(classes[0]?.id||""); const [editing,setEditing]=useState<Topic|null>(null); const [adding,setAdding]=useState(false); const [publishing,setPublishing]=useState<Worksheet|null>(null);
  const classTopics=topics.filter((x:Topic)=>x.classIds.includes(classId));
  const save=(x:Topic)=>{setTopics(topics.some((z:Topic)=>z.id===x.id)?topics.map((z:Topic)=>z.id===x.id?x:z):[...topics,x]);setEditing(null);setAdding(false)};
  const remove=(id:string)=>{if(confirm(t("確定刪除此課題？","Delete this topic?")))setTopics(topics.filter((x:Topic)=>x.id!==id))};
  const draftWorksheets=(worksheets||[]).filter((w:Worksheet)=>w.status==="draft");
  const publishWorksheet=(ws:Worksheet,studentIds:string[])=>{
    const classIds=Array.from(new Set(students.filter((s:Student)=>studentIds.includes(s.id)).map((s:Student)=>s.classId))) as string[];
    const topicId=`t-ws-${Date.now()}`;
    const topic:Topic={id:topicId,nameZh:ws.titleZh,nameEn:ws.titleEn,date:new Date().toISOString().slice(0,10),dueDate:ws.dueDate,submissions:1,classIds,rubricId:"worksheet",worksheetId:ws.id};
    setTopics([...topics,topic]);
    setWorksheets((worksheets||[]).map((x:Worksheet)=>x.id===ws.id?{...x,status:"published",topicId,classIds,studentIds,updatedAt:now()}:x));
    setPublishing(null);
    alert(t("已發布到課題管理；已選學生現在可以看到工作紙。","Published to Topic Management; the selected students can now see the worksheet."));
  };
  return <><PageTitle title={t("課題管理","Topic Management")} sub={t("先選班別，再管理該班課題、日期、提交數量及評分準則","Select a class, then manage its topics, dates, submissions and rubric")} action={<button className="primary" onClick={()=>setAdding(true)}><Plus size={16}/>{t("新增課題","Add Topic")}</button>}/>
    {draftWorksheets.length>0&&<div className="worksheet-publish-panel"><div><h2>{t("待發布工作紙","Worksheet Drafts Ready to Publish")}</h2><p>{t("工作紙建立後先保留草稿；在這裡選擇「發布給學生」，可以指定發布給哪些學生。","Worksheets stay as drafts until you publish them here. You can choose exactly which students receive each one.")}</p></div>{draftWorksheets.map((w:Worksheet)=><div className="worksheet-draft-row" key={w.id}><div><b>{t(w.titleZh,w.titleEn)}</b><small>{w.questions.length} {t("題 · 總分 100","questions · total 100")}</small></div><button className="primary small" onClick={()=>setPublishing(w)}><Check size={14}/>{t("發布給學生","Publish to Students")}</button></div>)}</div>}
    <div className="class-tabs">{classes.map((c:ClassItem)=><button key={c.id} className={classId===c.id?"selected":""} onClick={()=>setClassId(c.id)}>{c.id}<small>{topics.filter((x:Topic)=>x.classIds.includes(c.id)).length}</small></button>)}</div>
    <div className="table-card">{classTopics.map((x:Topic)=><div className="table-row topic-row" key={x.id}><div><b>{x.nameZh}</b><small>{x.nameEn}</small></div><div>{dateText(x.date)}<small>{t("截止日期","Due Date")}: {dateText(x.dueDate)}</small></div><div>{x.submissions} {t("份","submission(s)")}</div><div className="row-actions"><button className="outline small" onClick={()=>setEditing(x)}><Edit3 size={14}/>{t("修改","Edit")}</button><button className="outline small" onClick={()=>remove(x.id)}><Trash2 size={14}/>{t("刪除","Delete")}</button></div></div>)}</div>
    {(editing||adding)&&<TopicModal topic={editing||{id:`t-${Date.now()}`,nameZh:"",nameEn:"",date:new Date().toISOString().slice(0,10),dueDate:new Date().toISOString().slice(0,10),submissions:1,classIds:[classId],rubricId:"default"}} classes={classes} t={t} onSave={save} onClose={()=>{setEditing(null);setAdding(false)}}/>}
    {publishing&&<PublishWorksheetModal worksheet={publishing} classes={classes} students={students} t={t} onPublish={(ids:string[])=>publishWorksheet(publishing,ids)} onClose={()=>setPublishing(null)}/>}
  </>
}

function TopicModal({topic,classes,t,onSave,onClose}:any){
  const [x,setX]=useState({...topic});
  return <Modal title={topic.nameZh?t("修改課題","Edit Topic"):t("新增課題","Add Topic")} onClose={onClose}><label>{t("中文課題名稱","Chinese Topic Name")}</label><input value={x.nameZh} onChange={e=>setX({...x,nameZh:e.target.value})}/><label>英文課題名稱 / English Topic Name</label><input value={x.nameEn} onChange={e=>setX({...x,nameEn:e.target.value})}/><label>{t("開始日期","Start Date")}</label><input type="date" value={x.date} onChange={e=>setX({...x,date:e.target.value})}/><label>{t("截止日期","Due Date")}</label><input type="date" value={x.dueDate} onChange={e=>setX({...x,dueDate:e.target.value})}/><label>{t("提交數量","Submission Count")}</label><select value={x.submissions} onChange={e=>setX({...x,submissions:Number(e.target.value)})}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select><label>{t("適用班別","Classes")}</label><div className="chips">{classes.map((c:ClassItem)=><button key={c.id} className={`chip ${x.classIds.includes(c.id)?"on":""}`} onClick={()=>setX({...x,classIds:x.classIds.includes(c.id)?x.classIds.filter((id:string)=>id!==c.id):[...x.classIds,c.id]})}>{c.id}</button>)}</div><div className="modal-actions"><button className="outline" onClick={onClose}>{t("取消","Cancel")}</button><button className="primary" onClick={()=>onSave(x)}>{t("儲存","Save")}</button></div></Modal>
}

function AssessmentView({students,classes,topics,subs,setSubs,t,topicName}:any){
  const [classId,setClassId]=useState(classes[0]?.id||""); const [topicId,setTopicId]=useState(""); const [sid,setSid]=useState<string|null>(null);
  const classTopics=topics.filter((x:Topic)=>x.classIds.includes(classId));
  useEffect(()=>{setTopicId(classTopics[0]?.id||"");setSid(null)},[classId]);
  const topic=classTopics.find((x:Topic)=>x.id===topicId);
  const list=students.filter((st:Student)=>st.classId===classId&&st.status!=="withdrawn").sort((a:Student,b:Student)=>Number(a.number)-Number(b.number));
  const selected=list.find((st:Student)=>st.id===sid);
  const sub=selected&&topic?subs.filter((x:Submission)=>x.studentId===selected.id&&x.topicId===topic.id).sort((a:Submission,b:Submission)=>b.version-a.version)[0]:null;
  return <><PageTitle title={t("評核","Assessment")} sub={t("選擇班別 → 課題 → 學生，再進行評核","Select class → topic → student, then assess")}/>
    <div className="class-tabs">{classes.map((c:ClassItem)=><button key={c.id} className={classId===c.id?"selected":""} onClick={()=>setClassId(c.id)}>{c.id}</button>)}</div>
    <div className="control-row"><select value={topicId} onChange={e=>{setTopicId(e.target.value);setSid(null)}}><option value="">{t("選擇課題","Select topic")}</option>{classTopics.map((x:Topic)=><option key={x.id} value={x.id}>{topicName(x)}</option>)}</select></div>
    {!sid?<div className="assessment-list table-card"><div className="table-head"><span>{t("學號","No.")}</span><span>{t("學生","Student")}</span><span>{t("提交日期","Submission Date")}</span><span>{t("狀態","Status")}</span><span>{t("分數","Marks")}</span></div>
      {list.map((st:Student)=>{const latest=topic&&subs.filter((q:Submission)=>q.studentId===st.id&&q.topicId===topic.id).sort((a:Submission,b:Submission)=>b.version-a.version)[0];const total=latest?.marks?.reduce((a:number,b:number)=>a+b,0);return <button className="table-row clickable-row" key={st.id} disabled={!latest} onClick={()=>latest&&setSid(st.id)}><span>{st.number}</span><span><b>{st.name}</b></span><span>{latest?dateText(latest.uploadedAt):"—"}</span><span>{latest?.status==="assessed"?t("已評核","Assessed"):latest?t("待評核","Awaiting"):t("未提交","Not submitted")}</span><span>{total!==undefined?<strong className="score">{total}/100</strong>:"—"}</span></button>})}
    </div>:selected&&sub?<AssessmentCard key={sub.id} s={selected} topic={topic} sub={sub} subs={subs} setSubs={setSubs} t={t} onBack={()=>setSid(null)}/>:<div className="empty"><Check size={35}/><h3>{t("目前沒有可供評核的作品","No submitted artwork is available for assessment")}</h3><button className="outline" onClick={()=>setSid(null)}>{t("返回學生列表","Back to student list")}</button></div>}
  </>
}

function AssessmentCard({s,topic,sub,subs,setSubs,t,onBack}:any){
  const initial=sub.marks||[0,0,0,0];
  const [marks,setMarks]=useState<number[]>(initial);
  const [levels,setLevels]=useState<string[]>(rubric.map((r:any,i:number)=>levelForMark(initial[i]||0)));
  const [good,setGood]=useState<string[]>(sub.feedbackGood||[]); const [improve,setImprove]=useState<string[]>(sub.feedbackImprove||[]);
  const [comment,setComment]=useState(sub.comment||""); const totalMark=marks.reduce((a,b)=>a+b,0);
  const chooseLevel=(i:number,level:string)=>{setLevels(levels.map((x,j)=>j===i?level:x));const range=levelRange(level);setMarks(marks.map((x,j)=>j===i?(level==="0"?0:range[0]):x))};
  const chooseMark=(i:number,n:number)=>setMarks(marks.map((x,j)=>j===i?n:x));
  const save=()=>{const updated={...sub,marks,status:"assessed",feedbackGood:good,feedbackImprove:improve,comment,assessedAt:now()};setSubs(subs.map((x:Submission)=>x.id===sub.id?updated:x));alert(t("已儲存評核結果。","Assessment saved."));};
  const toggle=(arr:string[],set:(x:string[])=>void,id:string)=>set(arr.includes(id)?arr.filter(x=>x!==id):[...arr,id]);
  return <div><button className="back" onClick={onBack}><ChevronLeft size={17}/>{t("返回學生列表","Back to student list")}</button><div className="review-grid">
    <div><div className="review-header"><div><p className="eyebrow">{s.classId} · No.{s.number}</p><h2>{s.name}</h2><p>{topic.nameZh} / {topic.nameEn}</p></div><div className="score-circle"><b>{totalMark}</b><small>/100</small></div></div><img className="review-image" src={sub.image}/><div className="student-note"><b>{t("提交日期","Submission Date")}</b><p>{dateText(sub.uploadedAt)} · Version {sub.version}</p></div></div>
    <div className="review-panel"><h2>{t("評核準則","Assessment Criteria")}</h2>
      {rubric.map((r:any,i:number)=><div className="rubric" key={r.id}><div className="rubric-title"><span>{i+1}. {langLabel(r,t)} /25</span></div>
        <div className="level-buttons">{r.levels.map((lv:any)=><button key={lv[0]} className={levels[i]===lv[0]?"selected":""} onClick={()=>chooseLevel(i,lv[0])}><b>{t(lv[0],lv[1])}</b>{lv[2]&&<small>{lv[2]}</small>}<em>{levelRangeText(lv[0])}</em></button>)}</div>
        {levels[i]&&levels[i]!=="0"&&<div className="chosen-range"><span>{t("實際分數","Actual mark")} <b>{levelRangeText(levels[i])}</b></span><div className="score-range-buttons">{rangeValues(levels[i]).map(n=><button key={n} className={marks[i]===n?"selected":""} onClick={()=>chooseMark(i,n)}>{n}</button>)}</div><input className="score-input" type="number" min={levelRange(levels[i])[0]} max={levelRange(levels[i])[1]} value={marks[i]||""} onChange={e=>{const n=Number(e.target.value);if(!Number.isNaN(n)&&n>=levelRange(levels[i])[0]&&n<=levelRange(levels[i])[1])chooseMark(i,n)}} onKeyDown={e=>{if(e.key==="Enter"&&i<3){const el=document.querySelector(`[data-score-index="${i+1}"]`) as HTMLElement;el?.focus()}}} data-score-index={i}/></div>}
      </div>)}
      <hr/><h3>{t("教師評語","Teacher Feedback")}</h3><p className="muted">{t("常用評語可直接按選取；有個別情況可在下方自行補充。","Select common comments, then add your own note for individual cases.")}</p>
      <h4>{t("優點","Strengths")}</h4><div className="chips">{goodOptions.map(o=><button key={o[0]} className={`chip ${good.includes(o[0])?"on":""}`} onClick={()=>toggle(good,setGood,o[0])}>{t(o[2],o[1])}</button>)}</div>
      <h4>{t("改善方向","Areas for Improvement")}</h4><div className="chips">{improveOptions.map(o=><button key={o[0]} className={`chip ${improve.includes(o[0])?"on":""}`} onClick={()=>toggle(improve,setImprove,o[0])}>{t(o[2],o[1])}</button>)}</div>
      <label>{t("其他評語／補充","Additional Comment")}</label><textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder={t("如有特別情況，在這裡自行輸入…","Type any individual comment here…")}/>
      <div className="save-row"><button className="primary" onClick={save}><Check size={17}/>{t("儲存評核結果","Save Assessment")}</button></div>
    </div></div></div>
}
function levelRange(level:string){const r:any={"高":[21,25],"中高":[16,20],"中":[11,15],"中低":[6,10],"低":[1,5],"0":[0,0]};return r[level]||[0,0]}
function levelRangeText(level:string){const r:any={"高":"21–25","中高":"16–20","中":"11–15","中低":"6–10","低":"1–5","0":"0"};return r[level]||""}
function rangeValues(level:string){const [a,b]=levelRange(level);return Array.from({length:b-a+1},(_,i)=>a+i)}
function levelForMark(n:number){if(n===0)return "0";if(n>=21)return "高";if(n>=16)return "中高";if(n>=11)return "中";if(n>=6)return "中低";return "低"}
function langLabel(r:any,t:any){return t(r.zh,r.en)}

function BookView({students,classes,topics,subs,setSubs,worksheets,t,topicName,initialStudentId}:any){
  const initial=students.find((x:Student)=>x.id===initialStudentId); const [classId,setClassId]=useState(initial?.classId||classes[0]?.id||""); const [sid,setSid]=useState<string|null>(initialStudentId||null); const [reviewId,setReviewId]=useState<string|null>(null); const [wsReviewId,setWsReviewId]=useState<string|null>(null);
  useEffect(()=>{if(initialStudentId){const st=students.find((x:Student)=>x.id===initialStudentId);if(st){setClassId(st.classId);setSid(st.id)}}},[initialStudentId]);
  const list=students.filter((st:Student)=>st.classId===classId).sort((a:Student,b:Student)=>Number(a.number)-Number(b.number)); const s=list.find((x:Student)=>x.id===sid); const reviewSub=subs.find((x:Submission)=>x.id===reviewId); const reviewTopic=reviewSub?topics.find((x:Topic)=>x.id===reviewSub.topicId):null;
  const wsReviewSub=subs.find((x:Submission)=>x.id===wsReviewId); const wsReviewTopic=wsReviewSub?topics.find((x:Topic)=>x.id===wsReviewSub.topicId):null; const wsReviewWorksheet=wsReviewTopic?(worksheets||[]).find((w:Worksheet)=>w.id===wsReviewTopic.worksheetId):null;
  return <><PageTitle title={t("學生作品紀錄","Student Portfolio Records")} sub={t("按班別及學生一覽作品、分項評核及教師評語","Review artwork, assessment criteria and teacher feedback by class and student")}/>
    <div className="class-tabs">{classes.map((c:ClassItem)=><button key={c.id} className={classId===c.id?"selected":""} onClick={()=>{setClassId(c.id);setSid(null)}}>{c.id}</button>)}</div>
    <div className="control-row"><select value={sid||""} onChange={e=>setSid(e.target.value)}><option value="">{t("選擇學生","Select student")}</option>{list.map((x:Student)=><option key={x.id} value={x.id}>{x.number} · {x.name}</option>)}</select></div>
    <div className="table-card"><div className="table-head"><span>{t("學號","No.")}</span><span>{t("學生","Student")}</span><span>{t("已評核課題","Assessed Topics")}</span><span>{t("平均分","Average")}</span></div>
      {list.map((x:Student)=>{const assessed=subs.filter((q:Submission)=>q.studentId===x.id&&q.status==="assessed");const avg=assessed.length?Math.round(assessed.reduce((a,q)=>a+(q.marks?.reduce((u,v)=>u+v,0)||0),0)/assessed.length):null;return <button className={`table-row clickable-row ${sid===x.id?"selected-row":""}`} key={x.id} onClick={()=>setSid(x.id)}><span>{x.number}</span><span><b>{x.name}</b></span><span>{assessed.length}</span><span>{avg!==null?<strong className="score">{avg}/100</strong>:"—"}</span></button>})}
    </div>
    {s&&<div className="portfolio-list"><h2>{s.name} · {s.classId} · No.{s.number}</h2>
      {topics.filter((x:Topic)=>x.classIds.includes(s.classId)).map(x=>{
        const isWorksheet=x.rubricId==="worksheet";
        const ss=subs.filter((q:Submission)=>q.studentId===s.id&&q.topicId===x.id).sort((a:Submission,b:Submission)=>b.version-a.version);const q=ss[0];
        if(isWorksheet){
          return <button className={`portfolio-list-row clickable-row ${q?"":"no-submission-row"}`} key={x.id} disabled={!q} onClick={()=>q&&setWsReviewId(q.id)}><div className="thumb"><BookOpen size={25}/></div><div className="portfolio-meta"><b>{topicName(x)}</b><span>{q?`${dateText(q.uploadedAt)} · Version ${q.version}`:t("尚未完成","Not completed")}</span>{q?.teacherChecked&&<span className="checked-badge"><Check size={13}/>{t("已批閱","Checked")}</span>}</div><strong>{q?`${q.autoScore??0}/100`:t("尚未完成","Not completed")}</strong></button>;
        }
        const total=q?.marks?.reduce((a:number,b:number)=>a+b,0);
        return <button className={`portfolio-list-row clickable-row ${q?"":"no-submission-row"}`} key={x.id} disabled={!q} onClick={()=>q&&setReviewId(q.id)}><div className="thumb">{q?<img src={q.image}/>:<BookOpen size={25}/>}</div><div className="portfolio-meta"><b>{topicName(x)}</b><span>{q?`${dateText(q.uploadedAt)} · Version ${q.version}`:t("尚未提交","Not submitted")}</span><span>{q?.assessedAt?`${t("評核日期","Assessment date")}: ${dateText(q.assessedAt)}`:""}</span></div><strong>{total!==undefined?`${total}/100`:t("待評核","Awaiting")}</strong></button>;
      })}
    </div>}
    {reviewSub&&reviewTopic&&<SubmissionReviewModal sub={reviewSub} topic={reviewTopic} t={t} onClose={()=>setReviewId(null)}/>} 
    {wsReviewSub&&wsReviewWorksheet&&<WorksheetPortfolioModal sub={wsReviewSub} worksheet={wsReviewWorksheet} subs={subs} setSubs={setSubs} t={t} onClose={()=>setWsReviewId(null)}/>}
  </>
}

function WorksheetPortfolioModal({sub,worksheet,subs,setSubs,t,onClose}:any){
  const answers=sub.answers||{};
  const correct=(q:WorksheetQuestion)=>{if(q.type==="short")return null;const a=String(answers[q.id]||"").trim().toLowerCase();const acc=(q.acceptedAnswers?.length?q.acceptedAnswers:[q.answer].flat().filter(Boolean) as string[]).map(x=>String(x).trim().toLowerCase());return acc.includes(a)};
  const toggleChecked=()=>setSubs(subs.map((x:Submission)=>x.id===sub.id?{...x,teacherChecked:!x.teacherChecked}:x));
  return <Modal title={t(worksheet.titleZh,worksheet.titleEn)} onClose={onClose}><div className="review-modal-content">
    <div className="review-result-score"><b>{sub.autoScore??0}</b><span>/100</span></div>
    <p className="muted">{t("提交時間","Submitted")}: {dateText(sub.uploadedAt)}</p>
    {worksheet.questions.map((q:WorksheetQuestion,i:number)=>{const ok=correct(q);return <div className="worksheet-question" key={q.id}><div className="question-head"><b>{i+1}. {q.type==="mc"?t("選擇題","Multiple Choice"):q.type==="fill"?t("填充題","Fill in the Blank"):t("短答題","Short Answer")}</b>{ok===null?<span className="muted">{t("需人手核對","Manual check")}</span>:ok?<span>✓ {t("正確","Correct")}</span>:<span>✗ {t("錯誤","Incorrect")}</span>}</div><h3>{q.question}</h3><p><b>{t("學生答案","Student answer")}:</b> {answers[q.id]||t("沒有作答","No answer")}</p></div>})}
    <div className="save-row"><label className="publish-student-row" style={{border:"1px solid #ddd7ce",borderRadius:9,padding:"9px 11px"}}><input type="checkbox" checked={!!sub.teacherChecked} onChange={toggleChecked}/><span>{t("我已幫學生剔（批閱）這份工作紙","I've checked/ticked this worksheet")}</span></label></div>
  </div></Modal>;
}


function parseWorksheetText(text:string):WorksheetQuestion[]{
  const blocks=text.split(/(?=\[\s*第?\s*\d+\s*題)/i).map(x=>x.trim()).filter(Boolean);
  const out:WorksheetQuestion[]=[];
  for(let i=0;i<blocks.length;i++){const b=blocks[i];const head=b.match(/^\[\s*第?\s*\d+\s*題[^\]]*\]/i);if(!head)continue;const typeLine=b.match(/題型\s*[:：]\s*(選擇題|填充題|短答題|mcq|fill|short)/i);const type=typeLine?.[1]?.toLowerCase();const qmatch=b.match(/(?:題目|問題)\s*[:：]\s*([\s\S]*?)(?=\n(?:英文題目|English Question|A[.、:]|答案|答案[:：]))/i);const plain=b.replace(head[0],"").trim();const question=(qmatch?.[1]||plain.split(/\nA[.、:]/i)[0]||"").trim();const qm=b.match(/英文題目|English Question/i);const questionEn=qm?b.slice(qm.index!+qm[0].length).split(/\nA[.、:]|\n答案/i)[0].replace(/^\s*[:：]\s*/,"").trim():undefined;const opts:[string,string][]=[];for(const l of ["A","B","C","D"]){const m=b.match(new RegExp(`\n?${l}[.、:]\s*([^\n]+)`));if(m)opts.push([l,m[1].trim()]);}const ans=b.match(/答案\s*[:：]\s*([^\n]+)/i)?.[1]?.trim();let qt:WorksheetQuestion["type"]="short";if(type?.includes("選")||type==="mcq"||opts.length>=2)qt="mc";else if(type?.includes("填")||type==="fill")qt="fill";const options=qt==="mc"?opts.map(([label,v])=>({label,zh:v})):undefined;out.push({id:`q-${Date.now()}-${i}`,type:qt,question,questionEn,options,answer:ans,acceptedAnswers:qt==="fill"?ans?.split(/[;；,，|]/).map(x=>x.trim()).filter(Boolean):undefined,points:1});}
  return out.filter(q=>q.question);
}

function WorksheetLibrary({worksheets,setWorksheets,topics,setTopics,subs,setSubs,classes,students,t}:any){  const [editing,setEditing]=useState<Worksheet|null>(null); const [preview,setPreview]=useState<Worksheet|null>(null); const [paste,setPaste]=useState(""); const [publishing,setPublishing]=useState<Worksheet|null>(null);
  const save=(w:Worksheet)=>{const next=worksheets.some((x:Worksheet)=>x.id===w.id)?worksheets.map((x:Worksheet)=>x.id===w.id?{...w,updatedAt:now()}:x):[w,...worksheets];setWorksheets(next);setEditing(null);};
  const deleteWs=(id:string)=>{if(confirm(t("確定刪除這份工作紙？","Delete this worksheet?"))){setWorksheets(worksheets.filter((x:Worksheet)=>x.id!==id));}};
  const publish=(w:Worksheet,studentIds:string[])=>{
    const classIds=Array.from(new Set(students.filter((s:Student)=>studentIds.includes(s.id)).map((s:Student)=>s.classId))) as string[];
    const topicId=w.topicId||`t-ws-${Date.now()}`;
    const topic:Topic={id:topicId,nameZh:w.titleZh,nameEn:w.titleEn,date:new Date().toISOString().slice(0,10),dueDate:w.dueDate,submissions:1,classIds,rubricId:"worksheet",worksheetId:w.id};
    const nextWs=worksheets.map((x:Worksheet)=>x.id===w.id?{...x,classIds,studentIds,status:"published" as const,topicId,updatedAt:now()}:x);
    setWorksheets(nextWs);
    setTopics(topics.some((x:Topic)=>x.id===topicId)?topics.map((x:Topic)=>x.id===topicId?topic:x):[...topics,topic]);
    setPublishing(null);
    alert(t("工作紙已發布，已選學生現在可以看到。","Worksheet published. The selected students can now see it."));
  };
  const importText=()=>{const qs=rebalanceTo100(parseWorksheetText(paste));if(!qs.length){alert(t("找不到題目。請按照指定格式貼上。","No questions found. Please use the supported format."));return;}const w:Worksheet={id:`ws-${Date.now()}`,titleZh:"貼上工作紙",titleEn:"Pasted Worksheet",classIds:classes.slice(0,1).map((c:ClassItem)=>c.id),dueDate:new Date().toISOString().slice(0,10),questions:qs,status:"draft",createdAt:now()};save(w);setPaste("");alert(t(`成功辨識 ${qs.length} 題。`,`${qs.length} questions imported successfully.`));};
  return <><PageTitle title={t("工作紙管理","Worksheet Management")} sub={t("建立、修改、預覽、刪除及發布工作紙。AI 只是其中一個建立入口。","Create, edit, preview, delete and publish worksheets. AI is only one creation method.")} action={<button className="primary" onClick={()=>setPreview(null)}>{t("工作紙管理已獨立於 AI","Worksheet management is independent from AI")}</button>}/><div className="builder-card"><h2>{t("📋 直接貼上工作紙","📋 Paste an Existing Worksheet")}</h2><p className="muted">{t("格式：[第1題]、題型、題目、A-D、答案。填充題答案可用「；」分隔；短答題不需答案。","Format: [Question 1], type, question, A-D and answer. Fill-in accepted answers can be separated by semicolons; short answer needs no fixed answer.")}</p><textarea className="source-textarea" value={paste} onChange={e=>setPaste(e.target.value)} placeholder={"[第1題]\n題型：選擇題\n題目：三原色包括哪三種顏色？\n英文題目：Which are the primary colours?\nA. 紅、黃、藍\nB. 紅、綠、藍\nC. 紅、橙、紫\nD. 黃、綠、紫\n答案：A"}/><button className="primary" onClick={importText}><Clipboard size={16}/>{t("辨識並建立工作紙","Parse & Create Worksheet")}</button></div><div className="table-card">{worksheets.length===0?<div className="empty"><h3>{t("尚未建立工作紙","No worksheets yet")}</h3></div>:worksheets.map((w:Worksheet)=><div className="table-row" key={w.id}><div><b>{t(w.titleZh,w.titleEn)}</b><small>{w.questions.length} {t("題","questions")} · {w.status==="published"?`${(w.studentIds?.length||0)} ${t("位學生","students")}`:w.classIds.join(", ")}</small></div><span>{w.status==="published"?t("已發布","Published"):t("草稿","Draft")}</span><div className="row-actions"><button className="outline small" onClick={()=>setPreview(w)}>👁 {t("預覽","Preview")}</button><button className="outline small" onClick={()=>setEditing(w)}><Edit3 size={14}/>{t("修改","Edit")}</button><button className="primary small" onClick={()=>setPublishing(w)}><Check size={14}/>{w.status==="published"?t("重新發布","Republish"):t("發布","Publish")}</button><button className="outline small danger" onClick={()=>deleteWs(w.id)}><Trash2 size={14}/>{t("刪除","Delete")}</button></div></div>)}</div>{editing&&<WorksheetEditModal worksheet={editing} classes={classes} t={t} onSave={save} onClose={()=>setEditing(null)}/>} {preview&&<WorksheetPreviewModal worksheet={preview} t={t} onClose={()=>setPreview(null)}/>} {publishing&&<PublishWorksheetModal worksheet={publishing} classes={classes} students={students} t={t} onPublish={(ids:string[])=>publish(publishing,ids)} onClose={()=>setPublishing(null)}/>}</>;
}
function WorksheetEditModal({worksheet,classes,t,onSave,onClose}:any){
  const [w,setW]=useState<Worksheet>(JSON.parse(JSON.stringify(worksheet)));
  const patch=(id:string,p:Partial<WorksheetQuestion>)=>setW({...w,questions:w.questions.map(q=>q.id===id?{...q,...p}:q)});
  const remove=(id:string)=>setW({...w,questions:rebalanceTo100(w.questions.filter(q=>q.id!==id))});
  const add=()=>setW({...w,questions:rebalanceTo100([...w.questions,{id:`q-${Date.now()}`,type:"short",question:"",points:1}])});
  const setOpt=(q:WorksheetQuestion,label:string,value:string)=>patch(q.id,{options:(q.options||[]).map(o=>o.label===label?{...o,zh:value}:o)});
  const chooseImage=(e:any)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>setW({...w,sourceImage:String(r.result),sourceImageName:f.name});r.readAsDataURL(f)};
  return <Modal title={t("修改工作紙","Edit Worksheet")} onClose={onClose}><div className="review-modal-content"><label>{t("中文標題","Chinese Title")}</label><input value={w.titleZh} onChange={e=>setW({...w,titleZh:e.target.value})}/><label>{t("英文標題","English Title")}</label><input value={w.titleEn} onChange={e=>setW({...w,titleEn:e.target.value})}/>
    <label>{t("開始圖片（顯示在工作紙最前面，學生作答前會看到）","Cover Image (shown at the start of the worksheet, before students answer)")}</label>
    {w.sourceImage?<><img className="worksheet-source-image" src={w.sourceImage}/><div className="image-file-row"><span>{w.sourceImageName||t("已上傳圖片","Image uploaded")}</span><button className="outline small danger" onClick={()=>setW({...w,sourceImage:undefined,sourceImageName:undefined})}><Trash2 size={14}/>{t("移除圖片","Remove Image")}</button></div></>:
    <label className="worksheet-image-dropzone dropzone"><input type="file" accept="image/*" onChange={chooseImage}/><Upload size={30}/><b>{t("上載開始圖片（選填）","Upload a cover image (optional)")}</b><span className="muted">{t("例如題目相關的圖片或參考作品","e.g. a reference image related to the questions")}</span></label>}
    {w.questions.map((q,i)=><div className="worksheet-question" key={q.id}><div className="question-head"><b>{i+1}. {q.type}</b><button className="outline small danger" onClick={()=>remove(q.id)}><Trash2 size={14}/>{t("刪除","Delete")}</button></div><textarea value={q.question} onChange={e=>patch(q.id,{question:e.target.value})}/><input value={q.questionEn||""} onChange={e=>patch(q.id,{questionEn:e.target.value})} placeholder="English question (optional)"/>{q.options?.map(o=><div className="option-editor" key={o.label}><b>{o.label}</b><input value={o.zh} onChange={e=>setOpt(q,o.label,e.target.value)}/><input value={o.en||""} onChange={e=>patch(q.id,{options:(q.options||[]).map(x=>x.label===o.label?{...x,en:e.target.value}:x)})} placeholder="English"/></div>)}{q.type==="mc"&&<label>{t("正確答案","Correct Answer")}<select value={String(q.answer||"")} onChange={e=>patch(q.id,{answer:e.target.value})}>{(q.options||[]).map(o=><option key={o.label}>{o.label}</option>)}</select></label>}{q.type==="fill"&&<label>{t("答案（可填多個接受答案）","Accepted answers") }<input value={(q.acceptedAnswers||[]).join("; ")} onChange={e=>patch(q.id,{acceptedAnswers:e.target.value.split(/[;；,，]/).map(x=>x.trim()).filter(Boolean),answer:e.target.value.split(/[;；,，]/)[0]?.trim()})}/></label>}{q.type==="short"&&<p className="muted">{t("短答題提交後由老師批改。","Short answers are reviewed by the teacher.")}</p>}<label>{t("分值","Points")}<input type="number" min={1} value={q.points} onChange={e=>patch(q.id,{points:Number(e.target.value)||1})}/></label></div>)}<button className="outline" onClick={add}><Plus size={15}/>{t("新增題目","Add Question")}</button><div className="modal-actions"><button className="outline" onClick={onClose}>{t("取消","Cancel")}</button><button className="primary" onClick={()=>onSave({...w,questions:rebalanceTo100(w.questions)})}>{t("儲存修改","Save Changes")}</button></div></div></Modal>;
}

function WorksheetPreviewModal({worksheet,t,onClose}:any){return <Modal title={t(worksheet.titleZh,worksheet.titleEn)} onClose={onClose}><div className="review-modal-content">{worksheet.sourceImage&&<img className="worksheet-source-image" src={worksheet.sourceImage} alt=""/>}{worksheet.questions.map((q:WorksheetQuestion,i:number)=><div className="worksheet-question" key={q.id}><div className="question-head"><b>{i+1}. {q.type}</b><span>{q.points} {t("分","pts")}</span></div><h3>{q.question}</h3>{q.questionEn&&<p className="muted">{q.questionEn}</p>}{q.options?.map(o=><div key={o.label} className="preview-option"><b>{o.label}.</b> {o.zh}{o.en?` / ${o.en}`:""}</div>)}{q.type==="fill"&&<p>________________________</p>}{q.type==="short"&&<div className="short-lines">________________________________________<br/>________________________________________</div>}</div>)}</div></Modal>}

function PublishWorksheetModal({worksheet,classes,students,t,onPublish,onClose}:any){
  const initial=worksheet.studentIds?.length?worksheet.studentIds:students.filter((s:Student)=>worksheet.classIds.includes(s.classId)&&s.status!=="withdrawn").map((s:Student)=>s.id);
  const [selected,setSelected]=useState<Set<string>>(new Set(initial));
  const [activeClass,setActiveClass]=useState(worksheet.classIds[0]||classes[0]?.id||"");
  const toggle=(id:string)=>setSelected(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next});
  const classRoster=(cid:string)=>students.filter((s:Student)=>s.classId===cid&&s.status!=="withdrawn").sort((a:Student,b:Student)=>Number(a.number)-Number(b.number));
  const selectAllInClass=(cid:string)=>setSelected(prev=>{const next=new Set(prev);classRoster(cid).forEach((s:Student)=>next.add(s.id));return next});
  const clearClass=(cid:string)=>setSelected(prev=>{const next=new Set(prev);classRoster(cid).forEach((s:Student)=>next.delete(s.id));return next});
  const confirm=()=>{if(!selected.size){alert(t("請至少選擇一位學生。","Please select at least one student."));return;}onPublish(Array.from(selected));};
  return <Modal title={t("發布給指定學生","Publish to Selected Students")} onClose={onClose}>
    <p className="muted">{t("選擇班別以瀏覽學生名單，勾選的學生才會收到這份工作紙。","Pick a class to browse its roster. Only checked students will receive this worksheet.")}</p>
    <div className="class-tabs">{classes.map((c:ClassItem)=><button key={c.id} className={activeClass===c.id?"selected":""} onClick={()=>setActiveClass(c.id)}>{c.id}<small>{classRoster(c.id).filter((s:Student)=>selected.has(s.id)).length}/{classRoster(c.id).length}</small></button>)}</div>
    <div className="publish-toolbar"><button className="outline small" onClick={()=>selectAllInClass(activeClass)}>{t("本班全選","Select all in class")}</button><button className="outline small" onClick={()=>clearClass(activeClass)}>{t("本班取消","Deselect class")}</button><span className="publish-count">{t(`已選 ${selected.size} 位學生`,`${selected.size} student(s) selected`)}</span></div>
    <div className="publish-student-list">{classRoster(activeClass).map((s:Student)=><label className="publish-student-row" key={s.id}><input type="checkbox" checked={selected.has(s.id)} onChange={()=>toggle(s.id)}/><span>{s.name}</span><small>No.{s.number}</small></label>)}{!classRoster(activeClass).length&&<p className="muted">{t("這個班別沒有學生。","No students in this class.")}</p>}</div>
    <div className="modal-actions"><button className="outline" onClick={onClose}>{t("取消","Cancel")}</button><button className="primary" onClick={confirm}><Check size={16}/>{t("發布","Publish")}</button></div>
  </Modal>;
}

function WorksheetBuilder({worksheets,setWorksheets,classes,t}:any){
  const [source,setSource]=useState("");const [titleZh,setTitleZh]=useState("");const [titleEn,setTitleEn]=useState("");const [count,setCount]=useState(10);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  const generate=async()=>{if(!source.trim()){setError(t("請先貼上教材。","Please paste teaching material first."));return;}setLoading(true);setError("");try{const batches=[];for(let i=0;i<count;i+=5){const n=Math.min(5,count-i);const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),45000);try{const res=await fetch(`${AI_WORKER_URL}/worksheet`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:source,count:n}),signal:ctrl.signal});const payload=await res.json();if(!res.ok||!payload.success)throw new Error(payload.error||"AI generation failed");batches.push(...(payload.data?.questions||[]));}finally{clearTimeout(timer);}}const qs=rebalanceTo100(batches);if(qs.length<count)throw new Error(t(`AI 只生成了 ${qs.length} 題，請再試一次。`,`AI generated only ${qs.length} questions. Please try again.`));const w:Worksheet={id:`ws-${Date.now()}`,titleZh:titleZh||t("AI 工作紙","AI Worksheet"),titleEn:titleEn||"AI Worksheet",classIds:classes.slice(0,1).map((c:ClassItem)=>c.id),dueDate:new Date().toISOString().slice(0,10),questions:qs.slice(0,count),status:"draft",createdAt:now()};setWorksheets([w,...worksheets]);alert(t("AI 已建立工作紙草稿。請到「工作紙管理」修改及預覽。","AI created a worksheet draft. Open Worksheet Management to edit and preview."));setSource("");setTitleZh("");setTitleEn("");}catch(e){setError(e instanceof Error?e.message:t("AI 生成失敗。","AI generation failed."));}finally{setLoading(false);}};
  return <><PageTitle title={t("AI 建立工作紙","AI Worksheet")} sub={t("AI 只是輔助工具。生成後請到工作紙管理修改、預覽及發布。","AI is only an assistant. Edit, preview and publish from Worksheet Management after generation.")}/><div className="builder-card"><label>{t("中文標題","Chinese Title")}</label><input value={titleZh} onChange={e=>setTitleZh(e.target.value)}/><label>{t("英文標題","English Title")}</label><input value={titleEn} onChange={e=>setTitleEn(e.target.value)}/><label>{t("題目數量","Number of Questions")}</label><select value={count} onChange={e=>setCount(Number(e.target.value))}><option value={10}>10</option><option value={15}>15</option><option value={20}>20</option></select><label>{t("教材內容","Teaching Material")}</label><textarea className="source-textarea" value={source} onChange={e=>setSource(e.target.value)} placeholder={t("貼上教材內容…","Paste teaching material…")}/>{error&&<div className="warning">{error}</div>}<div className="builder-actions"><button className="primary" disabled={loading||!source.trim()} onClick={generate}>{loading?t("AI 生成中…每批最多 45 秒","Generating… max 45s per batch"):t("生成工作紙草稿","Generate Draft")}</button></div><p className="muted">{t("AI 頁面獨立於工作紙管理；即使 AI 很慢，你仍可正常管理、查看及修改已有工作紙。","AI is separate from worksheet management, so slow AI never blocks your existing worksheets.")}</p></div></>;
}

function GradesView({students,classes,topics,subs,t,topicName}:any){
  // 1. 計算個別學生作品的分數（相容工作紙與一般評核）
const getSubmissionScore = (sub: Submission) => {
  if (sub.autoScore !== undefined) return sub.autoScore;
  if (sub.marks && sub.marks.length) return sub.marks.reduce((a, b) => a + b, 0);
  return 0;
};

// 2. 計算某個班別的全班平均分
const calculateClassAverage = (classId: string) => {
  const classStudents = students.filter(s => s.classId === classId && s.status !== "withdrawn");
  const studentIds = classStudents.map(s => s.id);
  
  // 找出該班學生的所有最新提交紀錄
  const validSubs = subs.filter(s => studentIds.includes(s.studentId) && (s.marks?.length || s.autoScore !== undefined));
  
  if (!validSubs.length) return "—";
  
  const totalScore = validSubs.reduce((acc, sub) => acc + getSubmissionScore(sub), 0);
  return (totalScore / validSubs.length).toFixed(1);
};

// 3. 匯出 Excel (CSV) 檔案（內建 UTF-8 防亂碼處理）
const handleExportCSV = (selectedClassId: string) => {
  const classStudents = students.filter(s => s.classId === selectedClassId && s.status !== "withdrawn");
  const classTopics = topics.filter(t => t.classIds.includes(selectedClassId));

  // CSV 標頭：班別, 學號, 姓名, 課題1, 課題2..., 個人平均分
  let csvContent = "\uFEFF班別,學號,姓名," + classTopics.map(t => `"${t.nameZh}"`).join(",") + ",個人平均分\n";

  let classTotalScore = 0;
  let classSubCount = 0;

  classStudents.forEach(s => {
    let studentSum = 0;
    let studentCount = 0;

    const rowScores = classTopics.map(t => {
      const sub = subs
        .filter(x => x.studentId === s.id && x.topicId === t.id)
        .sort((a, b) => b.version - a.version)[0];

      if (!sub) return "未交";

      const score = getSubmissionScore(sub);
      studentSum += score;
      studentCount++;
      return score;
    });

    const studentAvg = studentCount > 0 ? (studentSum / studentCount).toFixed(1) : "—";
    if (studentCount > 0) {
      classTotalScore += studentSum;
      classSubCount += studentCount;
    }

    csvContent += `"${s.classId}","${s.number}","${s.name}",` + rowScores.join(",") + `,"${studentAvg}"\n`;
  });

  // 底部新增：全班總平均分
  const classAvg = classSubCount > 0 ? (classTotalScore / classSubCount).toFixed(1) : "—";
  csvContent += `全班平均分,,,` + classTopics.map(() => "").join(",") + `,"${classAvg}"\n`;

  // 觸發瀏覽器下載檔案
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${selectedClassId}_班級視覺藝術成績表.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
  const [classId,setClassId]=useState(classes[0]?.id||"2A"); const [topicId,setTopicId]=useState(topics[0]?.id||"");
  const list=students.filter((s:Student)=>s.classId===classId).sort((a:Student,b:Student)=>Number(a.number)-Number(b.number));
  const rows=list.map((s:Student)=>{const ss=subs.filter((q:Submission)=>q.studentId===s.id&&q.topicId===topicId&&q.status==="assessed");const marks=ss.flatMap((q:Submission)=>q.marks||[]);return {s,total:marks.length?marks.reduce((a,b)=>a+b,0):null}});
  const copy=(full:boolean)=>{const text=rows.map((r:any)=>full?`${r.s.number}\t${r.s.name}\t${r.total??""}`:`${r.total??""}`).join("\n");navigator.clipboard?.writeText(text);alert(t("已複製，可貼到成績表。","Copied. Ready to paste into your gradebook."))};
  return <><PageTitle title={t("成績","Grades")} sub={t("按學號排列，方便整理及匯出成績","Sorted by student number for accurate grade transfer")}/><div className="control-row"><select value={classId} onChange={e=>setClassId(e.target.value)}>{classes.map((c:ClassItem)=><option key={c.id}>{c.id}</option>)}</select><select value={topicId} onChange={e=>setTopicId(e.target.value)}>{topics.map((x:Topic)=><option key={x.id} value={x.id}>{topicName(x)}</option>)}</select><button className="outline" onClick={()=>copy(false)}><Copy size={16}/>{t("複製分數","Copy Marks")}</button><button className="primary" onClick={()=>copy(true)}><Copy size={16}/>{t("複製學號＋分數","Copy student numbers and marks")}</button></div><div className="table-card"><div className="table-head"><span>{t("學號","No.")}</span><span>{t("學生","Student")}</span><span>{t("分數","Marks")}</span><span>{t("狀態","Status")}</span></div>{rows.map((r:any)=><div className="table-row grades-row" key={r.s.id}><span>{r.s.number}</span><span><b>{r.s.name}</b></span><span>{r.total!==null?<strong className="score">{r.total}/100</strong>:<span className="pending-text">{t("未評分","Not assessed")}</span>}</span><span><Status status={r.s.status} t={t}/></span></div>)}</div></>
}

function Status({status,t}:{status:StudentStatus;t:any}){return <span className={`status-pill ${status}`}>{status==="active"?"🟢 "+t("正常上課","Active"):status==="longAbsence"?"🟡 "+t("暫時長期缺席","Long Absence"):"⚫ "+t("畢業／離校","Graduated / Withdrawn")}</span>}
function PageTitle({title,sub,action}:any){return <div className="page-title"><div><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>{action&&<div className="page-action">{action}</div>}</div>}
function Modal({title,onClose,children}:any){return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={17}/></button></div>{children}</div></div>}
<div className="class-settings-bar">
  <div>
    <h3>{selectedClassId} 班成績總覽</h3>
    <span>全班人數：{students.filter(s => s.classId === selectedClassId && s.status !== "withdrawn").length} 人</span>
  </div>

  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
    {/* 全班平均分顯示卡片 */}
    <div style={{ background: "#f5efff", padding: "8px 16px", borderRadius: "10px", border: "1px solid #d8b4fe" }}>
      <small style={{ color: "#6b21a8", fontWeight: "bold" }}>全班平均分</small>
      <div style={{ fontSize: "22px", fontWeight: "800", color: "#581c87" }}>
        {calculateClassAverage(selectedClassId)} <span style={{ fontSize: "13px" }}>分</span>
      </div>
    </div>

    {/* 匯出 CSV 成績單按鈕 */}
    <button className="primary" onClick={() => handleExportCSV(selectedClassId)}>
      📥 匯出 {selectedClassId} 班 CSV 成績表
    </button>
  </div>
</div>