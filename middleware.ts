// middleware.ts

// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export function middleware(req: NextRequest) {
//   const auth = req.headers.get('authorization');

//   const basicAuth = auth?.split(' ')[1];
//   const [user, pass] = atob(basicAuth || '').split(':');

//   const validUser = 'admin';
//   const validPass = process.env.PROTECT_PASSWORD;

//   if (user === validUser && pass === validPass) {
//     return NextResponse.next();
//   }

//   return new NextResponse('Authentication required', {
//     status: 401,
//     headers: {
//       'WWW-Authenticate': 'Basic realm="Secure Area"',
//     },
//   });
// }

// export const config = {
//   matcher: ['/((?!_next/static|favicon.ico).*)'], // Protect all routes except static files
// };
