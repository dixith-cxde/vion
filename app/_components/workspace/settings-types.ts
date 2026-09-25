export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export type WorkspaceData = {
  id: string;
  name: string;
  createdAt: string;
};

export type WorkspaceMember = {
  id: string;
  role: MemberRole;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string | null;
  };
};

export type Invitation = {
  id: string;
  email: string;
  role: MemberRole;
  status: string;
  createdAt: string;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success?: false;
  message?: string;
};
