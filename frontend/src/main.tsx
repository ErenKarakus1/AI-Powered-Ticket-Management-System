import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AuthResponse,
  Ticket,
  TicketMessage,
  TicketPriority,
  TicketStats,
  TicketStatus,
  createAdminTicketMessage,
  createTicket,
  createTicketMessage,
  getAdminTicketStats,
  listAdminTicketMessages,
  listAdminTickets,
  listTicketMessages,
  listTickets,
  login,
  register,
  updateAdminTicketPriority,
  updateAdminTicketStatus
} from "./api";
import "./styles.css";

type AuthMode = "login" | "register";
type StatusFilter = "ALL" | TicketStatus;
type PriorityFilter = "ALL" | TicketPriority;

const statusOptions: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const priorityOptions: TicketPriority[] = ["UNASSIGNED", "LOW", "MEDIUM", "HIGH", "URGENT"];
const statusRank: Record<TicketStatus, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  RESOLVED: 2,
  CLOSED: 3
};

const sortTickets = (items: Ticket[]) => {
  return [...items].sort((first, second) => {
    const statusDifference = statusRank[first.status] - statusRank[second.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  });
};

const sortTicketsByNewest = (items: Ticket[]) => {
  return [...items].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
};

const filterTickets = (
  items: Ticket[],
  statusFilter: StatusFilter,
  priorityFilter: PriorityFilter,
  sortItems: (items: Ticket[]) => Ticket[]
) => {
  const sortedTickets = sortItems(items);

  return sortedTickets.filter((ticket) => {
    const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || ticket.priority === priorityFilter;

    return matchesStatus && matchesPriority;
  });
};

const formatPriority = (priority: TicketPriority) => {
  return priority;
};

const storedAuth = () => {
  const raw = localStorage.getItem("auth");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    localStorage.removeItem("auth");
    return null;
  }
};

function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(() => storedAuth());
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [adminTickets, setAdminTickets] = useState<Ticket[]>([]);
  const [adminStats, setAdminStats] = useState<TicketStats | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [message, setMessage] = useState("");
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<StatusFilter>("ALL");
  const [adminStatusFilter, setAdminStatusFilter] = useState<StatusFilter>("ALL");
  const [adminPriorityFilter, setAdminPriorityFilter] = useState<PriorityFilter>("ALL");

  const isAdmin = auth?.user.role === "ADMIN";
  const visibleTickets = useMemo(
    () => filterTickets(tickets, ticketStatusFilter, "ALL", sortTicketsByNewest),
    [ticketStatusFilter, tickets]
  );
  const visibleAdminTickets = useMemo(
    () => filterTickets(adminTickets, adminStatusFilter, adminPriorityFilter, sortTickets),
    [adminPriorityFilter, adminStatusFilter, adminTickets]
  );

  const selectedFromLatestData = useMemo(() => {
    if (!selectedTicket) {
      return null;
    }

    return (
      [...tickets, ...adminTickets].find((ticket) => ticket.id === selectedTicket.id) ||
      selectedTicket
    );
  }, [adminTickets, selectedTicket, tickets]);

  const showMessage = (text: string) => {
    setMessage(text);
    setError("");
  };

  const showError = (text: string) => {
    setError(text);
    setMessage("");
  };

  const saveAuth = (nextAuth: AuthResponse) => {
    setAuth(nextAuth);
    localStorage.setItem("auth", JSON.stringify(nextAuth));
  };

  const loadTickets = async (token = auth?.token) => {
    if (!token) {
      return;
    }

    const result = await listTickets(token);
    setTickets(result.tickets);
  };

  const loadAdminTickets = async (token = auth?.token) => {
    if (!token || !isAdmin) {
      setAdminTickets([]);
      setAdminStats(null);
      return;
    }

    const [ticketResult, statsResult] = await Promise.all([
      listAdminTickets(token),
      getAdminTicketStats(token)
    ]);

    setAdminTickets(ticketResult.tickets);
    setAdminStats(statsResult.ticketStats);
  };

  const loadMessages = async (ticketId: string, token = auth?.token, admin = isAdmin) => {
    if (!token) {
      return;
    }

    const result = admin
      ? await listAdminTicketMessages(token, ticketId)
      : await listTicketMessages(token, ticketId);

    setTicketMessages(result.messages);
  };

  useEffect(() => {
    if (!auth) {
      setTickets([]);
      setAdminTickets([]);
      return;
    }

    if (auth.user.role === "ADMIN") {
      setTickets([]);
      void loadAdminTickets(auth.token).catch((err: Error) => showError(err.message));
      return;
    }

    setAdminStats(null);
    setAdminTickets([]);
    void loadTickets(auth.token).catch((err: Error) => showError(err.message));
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedFromLatestData) {
      setTicketMessages([]);
      return;
    }

    void loadMessages(selectedFromLatestData.id, auth.token, auth.user.role === "ADMIN").catch(
      (err: Error) => showError(err.message)
    );
  }, [auth, selectedFromLatestData?.id]);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result =
        authMode === "register"
          ? await register({ name, email, password })
          : await login({ email, password });

      saveAuth(result);
      setPassword("");
      showMessage(`Signed in as ${result.user.name}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!auth) {
      showError("Sign in before creating a ticket");
      return;
    }

    if (auth.user.role === "ADMIN") {
      showError("Admins cannot create tickets");
      return;
    }

    setLoading(true);

    try {
      const result = await createTicket(auth.token, { title, description });
      setTitle("");
      setDescription("");
      setSelectedTicket(result.ticket);
      await loadTickets(auth.token);
      showMessage("Ticket created");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Ticket creation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    if (!auth) {
      return;
    }

    setLoading(true);

    try {
      const result = await updateAdminTicketStatus(auth.token, ticketId, status);
      setSelectedTicket(result.ticket);
      await loadAdminTickets(auth.token);
      showMessage("Ticket status updated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = async (ticketId: string, priority: TicketPriority) => {
    if (!auth) {
      return;
    }

    setLoading(true);

    try {
      const result = await updateAdminTicketPriority(auth.token, ticketId, priority);
      setSelectedTicket(result.ticket);
      await loadAdminTickets(auth.token);
      showMessage("Ticket priority updated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Priority update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!auth || !selectedFromLatestData) {
      return;
    }

    setLoading(true);

    try {
      const result = isAdmin
        ? await createAdminTicketMessage(auth.token, selectedFromLatestData.id, messageBody)
        : await createTicketMessage(auth.token, selectedFromLatestData.id, messageBody);

      setTicketMessages((currentMessages) => [...currentMessages, result.message]);
      setMessageBody("");
      showMessage("Message sent");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Message could not be sent");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setAuth(null);
    setSelectedTicket(null);
    showMessage("Signed out");
  };

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <h1>Ticket Management</h1>
          <p>Support tickets, user access, and admin review in one workspace.</p>
        </div>
        {auth && (
          <div className="account">
            <span>{auth.user.name}</span>
            <strong>{auth.user.role}</strong>
            <button type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        )}
      </section>

      {(message || error) && (
        <div className={error ? "notice error" : "notice"}>{error || message}</div>
      )}

      {!auth ? (
        <section className="authPanel">
          <div className="tabs">
            <button
              type="button"
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === "register" ? "active" : ""}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="form">
            {authMode === "register" && (
              <label>
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Working..." : authMode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>
        </section>
      ) : (
        <section className={isAdmin ? "workspace adminWorkspace" : "workspace userWorkspace"}>
          {!isAdmin && (
            <div className="column">
              <form onSubmit={handleCreateTicket} className="panel form">
                <h2>Create Ticket</h2>
                <label>
                  Title
                  <input value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>
                <label>
                  Description
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={loading}>
                  Create ticket
                </button>
              </form>

              <TicketList
                title="My Tickets"
                tickets={visibleTickets}
                selectedId={selectedFromLatestData?.id}
                statusFilter={ticketStatusFilter}
                onStatusFilterChange={setTicketStatusFilter}
                onSelect={setSelectedTicket}
              />
            </div>
          )}

          {isAdmin && (
            <div className="column">
              <TicketList
                title="Admin Queue"
                tickets={visibleAdminTickets}
                selectedId={selectedFromLatestData?.id}
                statusFilter={adminStatusFilter}
                onStatusFilterChange={setAdminStatusFilter}
                priorityFilter={adminPriorityFilter}
                onPriorityFilterChange={setAdminPriorityFilter}
                stats={adminStats}
                onSelect={setSelectedTicket}
              />
            </div>
          )}

          <div className="column">
            <TicketDetail
              ticket={selectedFromLatestData}
              messages={ticketMessages}
              messageBody={messageBody}
              isAdminView={isAdmin && Boolean(selectedFromLatestData?.user)}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onMessageBodyChange={setMessageBody}
              onMessageSubmit={handleCreateMessage}
              loading={loading}
            />
          </div>
        </section>
      )}
    </main>
  );
}

function TicketList({
  title,
  tickets,
  selectedId,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  stats,
  onSelect
}: {
  title: string;
  tickets: Ticket[];
  selectedId?: string;
  statusFilter: StatusFilter;
  onStatusFilterChange: (statusFilter: StatusFilter) => void;
  priorityFilter?: PriorityFilter;
  onPriorityFilterChange?: (priorityFilter: PriorityFilter) => void;
  stats?: TicketStats | null;
  onSelect: (ticket: Ticket) => void;
}) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>{title}</h2>
        <span>{tickets.length}</span>
      </div>
      {stats && <TicketStatsSummary stats={stats} />}
      <div className="listControls">
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
          >
            <option value="ALL">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        {priorityFilter && onPriorityFilterChange && (
          <label>
            Priority
            <select
              value={priorityFilter}
              onChange={(event) => onPriorityFilterChange(event.target.value as PriorityFilter)}
            >
              <option value="ALL">All priorities</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {formatPriority(priority)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="ticketList">
        {tickets.length === 0 && <p className="empty">No tickets yet.</p>}
        {tickets.map((ticket) => (
          <button
            type="button"
            key={ticket.id}
            className={ticket.id === selectedId ? "ticketItem selected" : "ticketItem"}
            onClick={() => onSelect(ticket)}
          >
            <span>{ticket.title}</span>
            <small>
              {ticket.status} - {formatPriority(ticket.priority)}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

function TicketStatsSummary({ stats }: { stats: TicketStats }) {
  return (
    <div className="statsGrid">
      <span>Total {stats.total}</span>
      <span>Open {stats.open}</span>
      <span>In progress {stats.inProgress}</span>
      <span>Resolved {stats.resolved}</span>
      <span>Closed {stats.closed}</span>
    </div>
  );
}

function TicketDetail({
  ticket,
  messages,
  messageBody,
  isAdminView,
  onStatusChange,
  onPriorityChange,
  onMessageBodyChange,
  onMessageSubmit,
  loading
}: {
  ticket: Ticket | null;
  messages: TicketMessage[];
  messageBody: string;
  isAdminView: boolean;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  onPriorityChange: (ticketId: string, priority: TicketPriority) => void;
  onMessageBodyChange: (body: string) => void;
  onMessageSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}) {
  if (!ticket) {
    return (
      <section className="panel detail">
        <h2>Ticket Detail</h2>
        <p className="empty">Select a ticket to inspect it.</p>
      </section>
    );
  }

  return (
    <section className="panel detail">
      <div className="panelHeader">
        <h2>{ticket.title}</h2>
        <span>{ticket.status}</span>
      </div>
      <p>{ticket.description}</p>
      <dl>
        <div>
          <dt>Priority</dt>
          <dd>{formatPriority(ticket.priority)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
        </div>
        {ticket.user && (
          <div>
            <dt>Requester</dt>
            <dd>
              {ticket.user.name} - {ticket.user.email}
            </dd>
          </div>
        )}
      </dl>

      {isAdminView && (
        <div className="adminControls">
          <label>
            Status
            <select
              value={ticket.status}
              disabled={loading}
              onChange={(event) => onStatusChange(ticket.id, event.target.value as TicketStatus)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={ticket.priority}
              disabled={loading}
              onChange={(event) =>
                onPriorityChange(ticket.id, event.target.value as TicketPriority)
              }
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {formatPriority(priority)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {ticket.analysis && (
        <div className="analysis">
          <h3>AI Analysis</h3>
          <p>{ticket.analysis.summary}</p>
          <span>{ticket.analysis.category}</span>
        </div>
      )}

      <div className="messages">
        <h3>Messages</h3>
        <div className="messageList">
          {messages.length === 0 && <p className="empty">No messages yet.</p>}
          {messages.map((ticketMessage) => (
            <article key={ticketMessage.id} className="messageItem">
              <div>
                <strong>{ticketMessage.sender.name}</strong>
                <span>{ticketMessage.sender.role}</span>
              </div>
              <p>{ticketMessage.body}</p>
              <small>{new Date(ticketMessage.createdAt).toLocaleString()}</small>
            </article>
          ))}
        </div>
        <form onSubmit={onMessageSubmit} className="messageForm">
          <label>
            Reply
            <textarea
              rows={4}
              value={messageBody}
              onChange={(event) => onMessageBodyChange(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading || messageBody.trim().length === 0}>
            Send message
          </button>
        </form>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
