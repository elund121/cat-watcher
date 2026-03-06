import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      color: string;
      isSuperuser: boolean;
      avatar?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    dbUserId?: string;
    dbUserColor?: string;
    dbUserIsSuperuser?: boolean;
    dbUserAvatar?: string | null;
  }
}
