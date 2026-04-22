import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Replace 'react-game' with your actual GitHub repo name
  base: '/react-game/',
})
