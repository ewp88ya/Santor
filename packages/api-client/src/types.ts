export interface ApiResponse<T> {
  data: T;
  message?: string;
}


export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}
