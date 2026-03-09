import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png', 'icons/*.svg'],
        injectRegister: 'auto',
        manifest: {
          name: 'Anypok',
          short_name: 'Anypok', description: 'Anypok - 趣味创意工具集合 - 哆啦A梦分贝仪、奖惩大冒险、分组器等',
          theme_color: '#ff6b35',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          shortcuts: [
            {
              name: '广播接收器',
              short_name: '广播',
              description: '打开广播接收助手',
              url: '/broadcast',
              icons: [{ src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }]
            },
            {
              name: '分贝仪',
              short_name: '分贝',
              description: '哆啦A梦分贝监测',
              url: '/doraemon',
              icons: [{ src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }]
            },
            {
              name: '奖惩大冒险',
              short_name: '大冒险',
              description: '趣味奖惩游戏',
              url: '/adventure',
              icons: [{ src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }]
            },
            {
              name: '随机分组',
              short_name: '分组',
              description: '快速学生分组工具',
              url: '/group-maker',
              icons: [{ src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }]
            },
            {
              name: '晨光能量树',
              short_name: '能量树',
              description: '晨起打卡能量收集',
              url: '/kiddie-plan',
              icons: [{ src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }]
            }
          ],
          icons: [
            {
              src: '/icons/icon-72x72.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallbackDenylist: [/^\/roll-call/, /^\/homework/, /^\/tree/, /^\/morning-energy-tree/, /^\/api/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    // 移除 API 密钥注入，密钥现在保存在服务器端
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    }
  };
});
