type LocalUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "employer";
  phone?: string;
  companyName?: string;
  verificationStatus: string;
  emailVerified: boolean;
  profileImage?: string;
  employerProfile?: Record<string, unknown>;
};

type StoredUser = LocalUser & {
  passwordHash: string;
};

type RegisterData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
};

const USERS_KEY = "eliteBridgeEmployerUsers";
const SESSION_KEY = "eliteBridgeEmployerSession";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getStoredUsers(): StoredUser[] {
  try {
    const rawUsers = localStorage.getItem(USERS_KEY);
    return rawUsers ? (JSON.parse(rawUsers) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function sanitizeUser(user: StoredUser): LocalUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

async function hashPassword(password: string) {
  const encodedPassword = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encodedPassword);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generateToken(userId: number) {
  return `local-auth-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function saveSession(token: string, userId: number) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, userId }));
}

function getSession() {
  try {
    const rawSession = localStorage.getItem(SESSION_KEY);
    return rawSession ? (JSON.parse(rawSession) as { token: string; userId: number }) : null;
  } catch {
    return null;
  }
}

export const localAuthClient = {
  async register(data: RegisterData) {
    const email = normalizeEmail(data.email);
    const users = getStoredUsers();
    const existingUser = users.find((user) => user.email === email);

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const user: StoredUser = {
      id: Date.now(),
      email,
      passwordHash: await hashPassword(data.password),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      role: "employer",
      phone: data.phone?.trim() || undefined,
      companyName: data.companyName.trim(),
      verificationStatus: "pending",
      emailVerified: true,
    };

    saveStoredUsers([...users, user]);

    const token = generateToken(user.id);
    saveSession(token, user.id);

    return {
      message: "User registered successfully",
      token,
      user: sanitizeUser(user),
    };
  },

  async login(email: string, password: string) {
    const normalizedEmail = normalizeEmail(email);
    const users = getStoredUsers();
    const user = users.find((storedUser) => storedUser.email === normalizedEmail);
    const passwordHash = await hashPassword(password);

    if (!user || user.passwordHash !== passwordHash) {
      throw new Error("Invalid email or password");
    }

    const token = generateToken(user.id);
    saveSession(token, user.id);

    return {
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    };
  },

  getCurrentUser(token: string | null) {
    if (!token) {
      throw new Error("User not authenticated");
    }

    const session = getSession();

    if (!session || session.token !== token) {
      throw new Error("User not authenticated");
    }

    const user = getStoredUsers().find((storedUser) => storedUser.id === session.userId);

    if (!user) {
      throw new Error("User not found");
    }

    return {
      user: sanitizeUser(user),
    };
  },

  updateEmployerProfile(data: Record<string, unknown>) {
    const session = getSession();

    if (!session) {
      throw new Error("User not authenticated");
    }

    const users = getStoredUsers();
    const userIndex = users.findIndex((storedUser) => storedUser.id === session.userId);

    if (userIndex === -1) {
      throw new Error("User not found");
    }

    const updatedUser: StoredUser = {
      ...users[userIndex],
      employerProfile: data,
    };

    users[userIndex] = updatedUser;
    saveStoredUsers(users);

    return {
      message: "Employer profile updated successfully",
      user: sanitizeUser(updatedUser),
    };
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
  },
};
