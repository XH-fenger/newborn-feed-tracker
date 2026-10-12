# 新生儿喂养记录 · 微信小程序

本地优先（无后端）的新生儿喂养记录小程序。数据全部存储于设备本地（`wx.setStorageSync`），支持导出 JSON 备份与导入恢复。UI 完整复刻已评审定稿的 HTML 原型（Soft UI Evolution · 4 主题 · 暗黑模式 · iOS 交互风格）。

## 快速运行

1. 打开 **微信开发者工具** → 项目 → 导入项目
2. 目录选择：`newborn-feed-tracker/`
3. AppID 可先用「测试号」（游客模式）；正式发布时替换 `project.config.json` 中的 `appid`
4. 编译即可运行；真机预览体验完整（震动、转发文件导出需真机）

## 功能清单

| 模块 | 说明 |
| --- | --- |
| 首页 | 今日概览（喂养次数/奶量/尿布/睡眠）、距上次喂养环形进度（每分钟刷新）、最近 3 条记录、间隔超时全屏提醒触发 |
| 记一笔 | 喂养（母乳按毫升瓶喂、奶粉、混合）、尿布、睡眠、成长，以及维生素K1 / 维生素D / 维生素AD / 铁剂等补充剂；支持从历史进入编辑 |
| 统计 | 近 7 天喂养量渐变柱状图（canvas 生长动画）、尿布/睡眠趋势、成长体重折线、KPI 数据条 |
| 我的 | 宝宝资料、间隔提醒设置（1.5–4 小时）、4 主题切换、暗黑模式、导出/导入、清空数据 |
| 提醒闹钟 | 超过喂养间隔全屏闹钟（iOS 风格）：脉冲时钟 + 铃铛涟漪 + 震动循环 + 贪睡 9 分钟 / 停止后 1 小时静默 |
| 全部记录 | 4 类筛选、按日分组、点击进入编辑 |

## 技术要点

- **数据**：`wx.setStorageSync` 单键 `newborn_feed_v1`（baby / records / settings 三段式，与设计方案 §5 一致）；增删改后按时间倒序维护
- **主题**：CSS 自定义变量，页面根节点挂 `class="t-{{theme}} {{dark?'dark':''}}"`，4 套主题 + 暗黑正交，色值与原型逐值对齐（已脚本核对）
- **图标**：全部内联 SVG data URI（`utils/icons.js` 参数化生成颜色/尺寸/线宽），无第三方图标库
- **图表**：`utils/charts.js` canvas 2d 手绘（渐变柱 + 入场动画 + 折线面积图），无图表库依赖
- **样式基座**：app.wxss 顶部有全局 Reset（`view,text,input…{ box-sizing:border-box; margin:0; padding:0 }`）——对应原型 `*{...}` reset；小程序 WXSS 不支持 `*` 选择器，新增依赖默认宽度的元素时须注意此差异
- **input 高度陷阱**：微信 `input` 基础库默认 `height:1.4rem + overflow:hidden`，在 border-box 下上下 padding 会把内容区挤成负值（文字被裁）——`.tx` 必须显式 `height` 覆盖（48px），垂直居中交给组件自身，不要再写上下 padding
- **自定义导航度量**：`utils/nav.js` 统一输出 `{ sbH, navH, navBottom }`（状态栏高度 + 胶囊按钮 `getMenuButtonBoundingClientRect` 测量，参考 TDesign Navbar 方案）。带标题导航页 `.nav` 内联 `padding-top:{{sbH}}px`、行高 `navH`、内容偏移 `sbH+navH+10`；无标题页（我的/首页/闹钟）内容起点用 `navBottom`（胶囊底 + 对称间距）。新增页面勿再手写 `statusBarHeight` 硬编码偏移
- **自定义 TabBar**：毛玻璃胶囊 + 主题联动 + 弹跳动效（`custom-tab-bar/`）
- **头像**：卡通动漫 PNG（`assets/avatar-boy.png` 男宝卷发 / `assets/avatar-girl.png` 女宝双辫蝴蝶结，320×320 已压缩），按宝宝性别自动切换（非女宝一律男宝），在「宝宝资料」页修改性别后首页/我的页 `onShow` 即时联动；圆形裁剪用 `image mode="aspectFill"` + `border-radius:50%`（容器勿加 `overflow:hidden`——我的页头像右下角有编辑角标会被裁掉）
- **震动**：仅闹钟响铃时 `wx.vibrateLong` 循环模式；日常点击交互不震动
- **导出**：`writeFile` → `shareFileMessage` 转发 JSON；不支持的环境自动回退剪贴板。**导入**：`chooseMessageFile`（2MB 上限）→ 结构校验 → 合并（按 id 去重）/ 覆盖（导入前自动快照备份）

## 目录结构

```
newborn-feed-tracker/
├── app.js / app.json / app.wxss      # 全局入口、4 Tab 注册、公共样式
├── theme.wxss                        # 主题令牌（4 主题 + 暗黑）
├── project.config.json / sitemap.json
├── assets/                           # 静态资源（卡通头像 PNG，按性别切换）
├── custom-tab-bar/                   # 自定义 TabBar（毛玻璃 + 主题联动）
├── components/toast/                 # 轻提示组件
├── utils/
│   ├── storage.js                    # 本地数据层（CRUD / 导入 / 清空）
│   ├── stats.js                      # 统计计算（今日 / 7 天聚合 / 成长序列）
│   ├── charts.js                     # canvas 图表绘制引擎
│   ├── export.js                     # 导出 / 导入 / 校验
│   ├── theme.js                      # 主题应用与全局同步
│   ├── icons.js                      # SVG 图标库（data URI）
│   └── time.js                       # 时间格式化
└── pages/
    ├── index/                        # 首页（今日概览 + 提醒触发）
    ├── record/                       # 记一笔（4 类表单 + 母乳计时器）
    ├── stats/                        # 统计（图表 + KPI）
    ├── mine/                         # 我的（设置 / 主题 / 数据）
    ├── history/                      # 全部记录
    ├── baby/                         # 宝宝资料编辑
    └── alarm/                        # 全屏提醒闹钟
```

## 验证记录（开发侧）

- 全部 JS `node --check` 语法通过；全部 JSON 解析通过
- WXML 标签配平 0 错误；页面/组件/导航引用 0 缺失；事件绑定 handler 0 缺失
- 主题色值与原型脚本比对：4 主题 × 10 变量 + 暗黑 23 变量 + 共享语义色 10 变量，全部一致
- 数据层运行时仿真（mock wx）：29/29 通过（含 merge 去重、主题设备偏好保留、删除后导入不复活）
- 导出/导入链路仿真：21/21 通过（文件名格式、剪贴板兜底、结构校验拒绝、大文件拒绝、两模式导入）

## 已知边界

- 开发者工具模拟器不支持 `shareFileMessage` 与部分震动 API——导出会走剪贴板兜底，震动需真机验证
- 主题/暗黑为设备偏好：导入数据不覆盖本机当前外观选择
- 提醒为应用内触发（进入首页时检查）；小程序退到后台无法主动弹闹钟，属平台限制
