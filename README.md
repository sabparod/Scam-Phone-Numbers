# Scam Phone Numbers

## รันระบบบนเครื่องหลัก

ต้องติดตั้ง Node.js ก่อน แล้วเปิด PowerShell ในโฟลเดอร์โปรเจกต์:

```powershell
npm install
npm run build
npm start
```

ระบบจะเปิดที่ `http://localhost:8787` และเซิร์ฟเวอร์จะรับการเชื่อมต่อจาก network อื่นผ่าน `0.0.0.0` อยู่แล้ว

## ส่งให้เครื่องอื่นข้ามคนละเน็ตแบบเร็วที่สุด

วิธีนี้เหมาะสำหรับทดลองหรือสาธิต เครื่องหลักต้องเปิดโปรแกรมทิ้งไว้ตลอด

1. ติดตั้ง [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) บนเครื่องหลัก
2. รันแอปก่อนด้วย `npm start`
3. เปิด PowerShell อีกหน้าต่าง แล้วรัน:

```powershell
cloudflared tunnel --url http://localhost:8787
```

4. เปิด URL `https://...trycloudflare.com` ที่คำสั่งแสดง บนเครื่องอื่นได้เลย

URL นี้เป็นชั่วคราวและอาจเปลี่ยนทุกครั้งที่เริ่ม tunnel ใหม่ ห้ามปิดหน้าต่าง tunnel ระหว่างใช้งาน

## ใช้งานเป็นลิงก์ถาวร

Deploy โปรเจกต์นี้ไปยังบริการ Node.js เช่น Render หรือ Railway โดยตั้งคำสั่งดังนี้:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variable: `PORT` ให้ใช้ค่าที่ hosting กำหนด หรือปล่อยว่างเพื่อให้ระบบใช้ค่าเริ่มต้น

ข้อมูลรายงานจะถูกเก็บใน `data/reports.json` บนเครื่องที่รัน server หาก hosting ไม่มี persistent disk ข้อมูลอาจหายเมื่อระบบ restart หรือ redeploy ควรย้ายข้อมูลไปฐานข้อมูลก่อนใช้งานจริง

## ใช้ใน Wi-Fi เดียวกัน

หา IPv4 ของเครื่องหลักด้วย `ipconfig` แล้วเปิด `http://<IPv4>:8787` จากเครื่องอื่น เช่น `http://192.168.1.20:8787` อาจต้องอนุญาต Node.js ผ่าน Windows Firewall
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
