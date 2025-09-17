# 1. Node 20 LTS 설치
#    (nvm 사용 시: nvm install 20 && nvm use 20)

# 2. pnpm 설치
npm i -g pnpm@9.6.0

# 3. 프로젝트 루트에서 의존성 설치
pnpm install

# 4. 서버 실행 (API, http://localhost:3001)
cd apps/server
pnpm dev

# 5. 웹 실행 (프론트, http://localhost:5173)
cd apps/web
pnpm dev
