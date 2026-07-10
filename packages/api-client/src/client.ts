export interface ApiClientOptions {
  baseUrl: string;
}


export class ApiClient {
  private baseUrl: string;


  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
  }


  async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {

    const response = await fetch(
      `${this.baseUrl}${path}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      }
    );


    if (!response.ok) {
      throw new Error(
        `API Error ${response.status}`
      );
    }


    return response.json() as Promise<T>;
  }


  get<T>(path: string) {
    return this.request<T>(
      path,
      {
        method: "GET",
      }
    );
  }


  post<T>(
    path: string,
    body: unknown
  ) {

    return this.request<T>(
      path,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

  }
}
