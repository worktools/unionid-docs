import { defineConfig } from 'vitepress'

const shared = {
  socialLinks: [
    { icon: 'github', link: 'https://github.com/worktools/unionid' }
  ],
  search: { provider: 'local' as const }
}

export default defineConfig({
  title: 'unionid',
  description: '直接支持代数数据类型与 pipeline 查询的 Rust 数据库',
  cleanUrls: true,
  lastUpdated: true,
  head: [['meta', { name: 'theme-color', content: '#111827' }]],
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/',
      title: 'unionid',
      description: '直接支持代数数据类型与 pipeline 查询的 Rust 数据库'
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'unionid',
      description: 'A Rust database with algebraic data types and pipeline queries'
    }
  },
  themeConfig: {
    ...shared,
    logo: '/logo.svg',
    locales: {
      root: {
        nav: [
          { text: '指南', link: '/guide/' },
          { text: '参考', link: '/reference/' }
        ],
        sidebar: {
          '/guide/': [
            {
              text: '指南',
              items: [
                { text: '认识 unionid', link: '/guide/' },
                { text: '快速开始', link: '/guide/getting-started' }
              ]
            }
          ],
          '/reference/': [
            {
              text: '参考',
              items: [
                { text: '语言概览', link: '/reference/' }
              ]
            }
          ]
        },
        outline: { label: '本页目录' },
        docFooter: { prev: '上一页', next: '下一页' },
        lastUpdated: { text: '最后更新于' },
        returnToTopLabel: '返回顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '外观'
      },
      en: {
        nav: [
          { text: 'Guide', link: '/en/guide/' },
          { text: 'Reference', link: '/en/reference/' }
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Meet unionid', link: '/en/guide/' },
                { text: 'Getting started', link: '/en/guide/getting-started' }
              ]
            }
          ],
          '/en/reference/': [
            {
              text: 'Reference',
              items: [
                { text: 'Language overview', link: '/en/reference/' }
              ]
            }
          ]
        },
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous page', next: 'Next page' },
        lastUpdated: { text: 'Last updated' },
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Appearance'
      }
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © worktools'
    }
  }
})
