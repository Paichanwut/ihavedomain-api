import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        // กำหนด CORS Header สำหรับทุกเส้นทาง (pathname: '/api/:path*')
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' }, // เปลี่ยนเป็นโดเมนเฉพาะเจาะจงถ้าต้องการความปลอดภัย
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
