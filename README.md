# 🎓 Handong BrainLeague (한동 브레인리그)

**AI 기반 강의 자료 퀴즈 생성 및 학습 플랫폼**

Handong BrainLeague는 한동대학교 학생들을 위한 지능형 학습 보조 플랫폼입니다. 교수님의 강의 자료(PDF, PPTX, DOCX)나 텍스트를 업로드하면, Google Gemini AI가 핵심 내용을 분석하여 자동으로 퀴즈를 생성해줍니다. 매일 퀴즈를 풀고 명예의 전당(Ranking)에 이름을 올려보세요!

---

## ✨ 주요 기능

### 1. AI 자동 퀴즈 생성
- **다양한 포맷 지원:** PDF, PPTX, DOCX 파일 업로드 및 직접 텍스트 입력 지원.
- **지능형 분석:** Google Gemini 2.0 Flash 모델을 사용하여 강의 자료의 핵심을 관통하는 5개의 문제(T/F, 객관식)를 생성.
- **일일 학습 제한:** 과도한 학습 방지 및 꾸준한 학습을 위해 하루 최대 2개의 퀴즈 생성 제한.

### 2. 관리자 대시보드 (Admin)
- **과목 관리:** 새로운 학습 과목 추가.
- **자료 업로드:** 파일 파싱 기술(`officeparser`)을 통해 문서 내 텍스트를 자동으로 추출하여 학습 데이터베이스 구축.

### 3. 사용자 경험 (UX/UI)
- **실시간 랭킹:** 퀴즈 점수를 합산하여 상위 10명의 '명예의 전당' 노출.
- **직관적인 퀴즈 인터페이스:** 진행률 표시줄과 깔끔한 카드 디자인으로 높은 몰입감 제공.
- **반응형 디자인:** 모바일과 데스크톱 모두에서 쾌적한 학습 환경.

---

## 🛠 Tech Stack

### Frontend
- **React 19 (TypeScript)**
- **Vite** (Fast Build Tool)
- **Vanilla CSS** (Custom Styling)

### Backend
- **Node.js (Express)**
- **SQLite** (Database)
- **JWT** (Authentication)
- **Multer & Officeparser** (File Processing)

### AI Service
- **Google Gemini API** (`gemini-flash-latest`)

---

## 🚀 시작하기

### 1. 저장소 클론
```bash
git clone https://github.com/HyeokjuCHu/handong_brainleague.git
cd handong_brainleague
```

### 2. 서버 설정
```bash
cd server
npm install
```
`.env` 파일을 생성하고 아래 내용을 입력합니다:
```env
GEMINI_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret
ADMIN_SECRET_KEY=your_admin_secret
PORT=3000
```

### 3. 클라이언트 설정
```bash
cd ../client
npm install
npm run build # 프로덕션 빌드 (서버에서 정적 파일 서빙)
# 또는 개발 모드 실행
npm run dev
```

### 4. 실행
```bash
cd ../server
npm run dev
```
접속 주소: `http://localhost:3000`

---

## 📝 개발자 정보
- **이름:** 주혁주 (HyeokjuCHu)
- **GitHub:** [https://github.com/HyeokjuCHu](https://github.com/HyeokjuCHu)

---

## ⚖️ License
This project is licensed under the ISC License.
