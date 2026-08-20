# VA Portfolio V2

這是由你提供的 `va_reference_bank.tsx` 初稿發展出的「學生作品記錄＋老師評分＋即時回饋」版本。

## 現在已改善

- 手機優先的學生介面
- 真正的 `<input type=file accept=image/* capture=environment>`：手機可直接拍照
- 學生資料自動帶入班別／學號
- 作品 Portfolio
- 待評分／已回饋狀態
- 老師 Dashboard
- Rubric 1–5 評分，自動換算 /100
- 一鍵常用 Feedback
- 學生即時看到老師 Feedback（本機 demo）
- localStorage：重新整理頁面後 demo 資料仍會保留

## 啟動

需要 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

然後開啟終端機顯示的網址。

## 重要：正式學校版

這一版仍然是「可操作 Prototype」，不是多學生共用的 production database。

要真正給五班學生使用，下一階段需要接：
1. Supabase Auth / 學校登入
2. Supabase Postgres Database
3. Supabase Storage（學生作品照片）
4. 老師／學生 Row Level Security 權限
5. 真正的課題、班別、Rubric、Feedback 資料表
6. 部署到 Vercel 或其他正式 hosting
7. 學校私隱／資料保存政策確認

這些不是單靠 TSX 可以安全完成的，所以不要把現在的 localStorage demo 直接當作學校正式資料庫。
