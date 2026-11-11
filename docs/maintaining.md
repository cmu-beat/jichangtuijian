# v18编辑与上传说明

## 日常修改

首页README.md可直接编辑。配套页面由maintenance/catalog.json的套餐资料与maintenance/editorial.mjs的原创分析生成，修改这两处后从本版本根目录运行：

```powershell
node docs/maintenance/build.mjs
node docs/maintenance/check.mjs
```

普通构建不会覆盖首页。若明确要按模板重建首页，先保存手工修改，再运行：

```powershell
node docs/maintenance/build.mjs --write-home
```

## 网页上传

选中本文件夹内部的README.md、docs和images三项上传到仓库根目录，保持相对路径。不要上传外层文件夹、父项目资料或本地Git配置。无需把图片逐张换成外链。

本版发布仓库为[tem-repo](https://github.com/21pounder/tem-repo)。本地分发文件夹保持不含.git；使用Git克隆维护时，.git只用于本地版本管理，不属于上传内容。检查脚本会跳过根目录的Git元数据。

## 编辑约定

- 18家顺序固定；套餐增删不自动重排机场。
- 沿用完整邀请URL，保留query和hash；Flybit使用本版go入口。
- 套餐必须有明确计费周期，不把年付折算、加油包或地区限定方案当作普通月付。
- 套餐推荐指数沿用已有数据，并在表格中居中，不随资料更新自动改变。
- 不复制原始剪贴文章、个人邮箱、公开评论或缺乏条件的第三方测试结论。
- 不把编辑月份写成已核价日期；新信息应更新集中资料说明。
- README改动后运行检查，避免断链、错序与表格列数变化。
- 品牌配图路径维护在catalog.json的image字段；网页引用images/banners内的WebP，原始PNG留作本地素材。

本文件夹采用Node.js 18以上的标准模块，无第三方运行依赖。
