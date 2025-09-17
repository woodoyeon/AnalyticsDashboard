// apps/web/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Home from './pages/Home'
import Finish from './pages/Finish'
import Problem1 from './pages/Problem1'
import Problem2 from './pages/Problem2'
import Problem3 from './pages/Problem3'
import Problem4 from './pages/Problem4'
import Problem5 from './pages/Problem5'
import Problem6 from './pages/Problem6'
import Problem7 from './pages/Problem7'
import Problem8 from './pages/Problem8'
import './index.css'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },       // ✅ 루트는 Home
  { path: '/finish', element: <Finish /> },
  { path: '/1', element: <Problem1 /> },
  { path: '/2', element: <Problem2 /> },
  { path: '/3', element: <Problem3 /> },
  { path: '/4', element: <Problem4 /> },
  { path: '/5', element: <Problem5 /> },
  { path: '/6', element: <Problem6 /> },
  { path: '/7', element: <Problem7 /> },
  { path: '/8', element: <Problem8 /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
