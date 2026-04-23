import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  // baseURL pointe vers le backend FastAPI port 8000
  // PAS vers localhost:3000 qui est le frontend React
})

// Intercepteur : ajoute le token JWT à chaque requête
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur : redirige vers /login si token expiré (401)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)



export { api }
export default api