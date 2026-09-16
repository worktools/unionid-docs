import { defineConfig } from 'vitepress'

const zhSidebar = [
  {
    text: '开始使用',
    items: [
      { text: '认识 unionid', link: '/guide/' },
      { text: '五分钟开始', link: '/guide/getting-started' },
      { text: '项目结构', link: '/guide/project-layout' }
    ]
  },
  {
    text: '语言与数据',
    items: [
      { text: '语言导览', link: '/language/' },
      { text: '数据模型', link: '/language/data-model' },
      { text: '标量与表达式', link: '/language/scalars' },
      { text: '查询', link: '/language/queries' },
      { text: '写入', link: '/language/mutations' }
    ]
  },
  {
    text: '应用集成',
    items: [
      { text: '选择接入方式', link: '/integration/' },
      { text: 'CLI 与 REPL', link: '/integration/cli' },
      { text: 'Rust API', link: '/integration/rust' },
      { text: 'TCP、HTTP 与流', link: '/integration/protocols' }
    ]
  },
  {
    text: '生产运维',
    items: [
      { text: '运维导览', link: '/operations/' },
      { text: '存储与故障语义', link: '/operations/storage' },
      { text: 'Schema migration', link: '/operations/migrations' },
      { text: '备份、还原与压缩', link: '/operations/backup' },
      { text: '服务部署', link: '/operations/deployment' },
      { text: '指标与排障', link: '/operations/observability' },
      { text: '版本升级', link: '/operations/upgrading' }
    ]
  },
  {
    text: '参考',
    items: [
      { text: '参考导览', link: '/reference/' },
      { text: '命令速查', link: '/reference/commands' },
      { text: '错误与限制', link: '/reference/limits' },
      { text: '版本与兼容性', link: '/reference/compatibility' }
    ]
  },
  {
    text: '完整规范手册',
    collapsed: true,
    items: [
      { text: '语言规范', link: '/reference/language-reference' },
      { text: '查询与表达式', link: '/reference/query-reference' },
      { text: '数据协议', link: '/reference/protocol-reference' },
      { text: 'CLI', link: '/reference/cli-reference' },
      { text: 'Rust API', link: '/reference/rust-reference' },
      { text: '存储、迁移与恢复', link: '/reference/storage-reference' },
      { text: '服务与资源边界', link: '/reference/service-reference' }
    ]
  }
]

const enSidebar = [
  {
    text: 'Getting started',
    items: [
      { text: 'Meet unionid', link: '/en/guide/' },
      { text: 'Five-minute guide', link: '/en/guide/getting-started' },
      { text: 'Project layout', link: '/en/guide/project-layout' }
    ]
  },
  {
    text: 'Language and data',
    items: [
      { text: 'Language tour', link: '/en/language/' },
      { text: 'Data model', link: '/en/language/data-model' },
      { text: 'Scalars and expressions', link: '/en/language/scalars' },
      { text: 'Queries', link: '/en/language/queries' },
      { text: 'Mutations', link: '/en/language/mutations' }
    ]
  },
  {
    text: 'Integration',
    items: [
      { text: 'Choose an entry point', link: '/en/integration/' },
      { text: 'CLI and REPL', link: '/en/integration/cli' },
      { text: 'Rust API', link: '/en/integration/rust' },
      { text: 'TCP, HTTP, and streams', link: '/en/integration/protocols' }
    ]
  },
  {
    text: 'Operations',
    items: [
      { text: 'Operations tour', link: '/en/operations/' },
      { text: 'Storage and failures', link: '/en/operations/storage' },
      { text: 'Schema migrations', link: '/en/operations/migrations' },
      { text: 'Backup and compaction', link: '/en/operations/backup' },
      { text: 'Service deployment', link: '/en/operations/deployment' },
      { text: 'Metrics and diagnosis', link: '/en/operations/observability' },
      { text: 'Upgrading', link: '/en/operations/upgrading' }
    ]
  },
  {
    text: 'Reference',
    items: [
      { text: 'Reference overview', link: '/en/reference/' },
      { text: 'Command quick reference', link: '/en/reference/commands' },
      { text: 'Errors and limits', link: '/en/reference/limits' },
      { text: 'Versions and compatibility', link: '/en/reference/compatibility' }
    ]
  },
  {
    text: 'Complete manuals',
    collapsed: true,
    items: [
      { text: 'Language specification', link: '/en/reference/language-reference' },
      { text: 'Queries and expressions', link: '/en/reference/query-reference' },
      { text: 'Data protocol', link: '/en/reference/protocol-reference' },
      { text: 'CLI', link: '/en/reference/cli-reference' },
      { text: 'Rust API', link: '/en/reference/rust-reference' },
      { text: 'Storage and recovery', link: '/en/reference/storage-reference' },
      { text: 'Service boundaries', link: '/en/reference/service-reference' }
    ]
  }
]

export default defineConfig({
  base: process.env.DOCS_BASE || '/',
  title: 'unionid',
  description: '直接支持代数数据类型与 pipeline 查询的 Rust 数据库',
  cleanUrls: false,
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
    logo: '/logo.svg',
    socialLinks: [{ icon: 'github', link: 'https://github.com/worktools/unionid' }],
    search: { provider: 'local' },
    locales: {
      root: {
        nav: [
          { text: '开始', link: '/guide/' },
          { text: '语言', link: '/language/' },
          { text: '集成', link: '/integration/' },
          { text: '运维', link: '/operations/' },
          { text: '参考', link: '/reference/' }
        ],
        sidebar: zhSidebar,
        outline: { label: '本页目录', level: [2, 3] },
        docFooter: { prev: '上一页', next: '下一页' },
        lastUpdated: { text: '最后更新于' },
        returnToTopLabel: '返回顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '外观',
        editLink: {
          pattern: 'https://github.com/worktools/unionid-docs/edit/main/docs/:path',
          text: '在 GitHub 编辑此页'
        }
      },
      en: {
        nav: [
          { text: 'Start', link: '/en/guide/' },
          { text: 'Language', link: '/en/language/' },
          { text: 'Integration', link: '/en/integration/' },
          { text: 'Operations', link: '/en/operations/' },
          { text: 'Reference', link: '/en/reference/' }
        ],
        sidebar: enSidebar,
        outline: { label: 'On this page', level: [2, 3] },
        docFooter: { prev: 'Previous page', next: 'Next page' },
        lastUpdated: { text: 'Last updated' },
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Appearance',
        editLink: {
          pattern: 'https://github.com/worktools/unionid-docs/edit/main/docs/:path',
          text: 'Edit this page on GitHub'
        }
      }
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © worktools'
    }
  }
})
