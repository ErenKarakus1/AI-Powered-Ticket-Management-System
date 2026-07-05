export type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
};

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  analysis?: {
    id: string;
    ticketId: string;
    category: string;
    priority: TicketPriority;
    summary: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type AuthResponse = {
  user: User;
  token: string;
};

const apiUrl = "/api";

const request = async <T>(path: string, options: RequestInit = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const data = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

const authHeaders = (token: string) => {
  return {
    Authorization: `Bearer ${token}`
  };
};

export const register = (input: { name: string; email: string; password: string }) => {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
};

export const login = (input: { email: string; password: string }) => {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
};

export const createTicket = (token: string, input: { title: string; description: string }) => {
  return request<{ ticket: Ticket }>("/tickets", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
};

export const listTickets = (token: string) => {
  return request<{ tickets: Ticket[] }>("/tickets", {
    headers: authHeaders(token)
  });
};

export const getTicket = (token: string, id: string) => {
  return request<{ ticket: Ticket }>(`/tickets/${id}`, {
    headers: authHeaders(token)
  });
};

export const listAdminTickets = (token: string) => {
  return request<{ tickets: Ticket[] }>("/admin/tickets", {
    headers: authHeaders(token)
  });
};

export const updateAdminTicketStatus = (token: string, id: string, status: TicketStatus) => {
  return request<{ ticket: Ticket }>(`/admin/tickets/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status })
  });
};
