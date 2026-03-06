export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!signin|api/auth|_next/static|_next/image|favicon.ico|uploads/|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$|.*\\.svg$).*)"],
};
