export type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
};

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "UNASSIGNED" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketAssignmentFilter = "ALL" | "UNASSIGNED" | "MINE";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  userId: string;
  assignedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  unread?: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  assignedAdminId?: string | null;
  assignedAdmin?: {
    id: string;
    name: string;
    email: string;
  } | null;
  analysis?: {
    id?: string;
    ticketId?: string;
    category: string;
    priority?: TicketPriority;
    summary?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  messages?: Array<{
    createdAt: string;
    sender: {
      role: "USER" | "ADMIN";
    };
  }>;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
  };
};

export type TicketStats = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
};

export type TicketPage = {
  tickets: Ticket[];
  hasMore: boolean;
  nextOffset: number;
  totalCount?: number;
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

export const listTickets = (
  token: string,
  input: {
    limit: number;
    offset: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    search?: string;
  }
) => {
  const params = new URLSearchParams({
    limit: String(input.limit),
    offset: String(input.offset)
  });

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.priority) {
    params.set("priority", input.priority);
  }

  if (input.search) {
    params.set("search", input.search);
  }

  return request<TicketPage>(`/tickets?${params.toString()}`, {
    headers: authHeaders(token)
  });
};

export const getTicket = (token: string, id: string) => {
  return request<{ ticket: Ticket }>(`/tickets/${id}`, {
    headers: authHeaders(token)
  });
};

export const getAdminTicket = (token: string, id: string) => {
  return request<{ ticket: Ticket }>(`/admin/tickets/${id}`, {
    headers: authHeaders(token)
  });
};

export const markTicketRead = (token: string, id: string) => {
  return request<{ ticketRead: { id: string; ticketId: string; userId: string; lastReadAt: string } }>(
    `/tickets/${id}/read`,
    {
      method: "PATCH",
      headers: authHeaders(token)
    }
  );
};

export const listTicketNotifications = (token: string) => {
  return request<{ notifications: Ticket[] }>("/tickets/notifications", {
    headers: authHeaders(token)
  });
};

export const listAdminTickets = (
  token: string,
  input: {
    limit: number;
    offset: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignment?: TicketAssignmentFilter;
    search?: string;
  }
) => {
  const params = new URLSearchParams({
    limit: String(input.limit),
    offset: String(input.offset)
  });

  if (input.status) {
    params.set("status", input.status);
  }

  if (input.priority) {
    params.set("priority", input.priority);
  }

  if (input.assignment) {
    params.set("assignment", input.assignment);
  }

  if (input.search) {
    params.set("search", input.search);
  }

  return request<TicketPage>(`/admin/tickets?${params.toString()}`, {
    headers: authHeaders(token)
  });
};

export const getAdminTicketStats = (token: string) => {
  return request<{ ticketStats: TicketStats }>("/admin/tickets/stats", {
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

export const updateAdminTicketPriority = (
  token: string,
  id: string,
  priority: TicketPriority
) => {
  return request<{ ticket: Ticket }>(`/admin/tickets/${id}/priority`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ priority })
  });
};

export const updateAdminTicketAssignment = (
  token: string,
  id: string,
  assignedToMe: boolean
) => {
  return request<{ ticket: Ticket }>(`/admin/tickets/${id}/assignment`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ assignedToMe })
  });
};

export const listTicketMessages = (token: string, id: string) => {
  return request<{ messages: TicketMessage[] }>(`/tickets/${id}/messages`, {
    headers: authHeaders(token)
  });
};

export const createTicketMessage = (token: string, id: string, body: string) => {
  return request<{ message: TicketMessage }>(`/tickets/${id}/messages`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ body })
  });
};

export const listAdminTicketMessages = (token: string, id: string) => {
  return request<{ messages: TicketMessage[] }>(`/admin/tickets/${id}/messages`, {
    headers: authHeaders(token)
  });
};

export const createAdminTicketMessage = (token: string, id: string, body: string) => {
  return request<{ message: TicketMessage }>(`/admin/tickets/${id}/messages`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ body })
  });
};
