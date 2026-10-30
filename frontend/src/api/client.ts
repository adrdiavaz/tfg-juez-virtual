import axios, { type AxiosRequestConfig } from 'axios'

// withCredentials: la sesión viaja en una cookie HttpOnly
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  withCredentials: true,
})

// Mutator que usa el código generado por orval (src/api/generated)
export const apiClient = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> =>
  axiosInstance({ ...config, ...options }).then(({ data }) => data as T)
