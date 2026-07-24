# Ads Tool Factory Share Kit

这是一个可分享的广告工具工厂套件，用来帮助不同产品快速生成自己的广告文案工具。

这个 share-kit 不包含原作者的私有产品源码、Cloudflare token、Worker secret、KV 数据或用户 API key。

## 朋友应该怎么用

1. 下载或 clone 这个仓库。
2. 在自己的电脑上初始化一个自己的工厂目录。
3. 为自己的产品创建一个产品分支。
4. 把产品分支里的 `TASK.md` 发给自己使用的 AI 工具。

## 快速开始

```powershell
cd <这个仓库目录>
.\scripts\init_friend_factory.ps1 -FactoryRoot "D:\MyAdsToolFactory" -OwnerName "your-name"
cd D:\MyAdsToolFactory
.\scripts\new_product.ps1 -Slug my-product -DisplayName "My Product" -Industry "utility-app" -BasedOn "share-kit"
```

然后把这个文件发给你的 AI：

```text
D:\MyAdsToolFactory\products\my-product\TASK.md
```

## 不使用 Codex 也可以

如果你用 Claude、Cursor、Gemini、Kimi、通义或其他 AI，把下面这些文件作为上下文发给它：

- `README_FOR_ANY_AI.md`
- `docs/PROMOTION_PROTOCOL.md`
- `docs/RELEASE_CHECKLIST.md`
- `products/<your-product>/TASK.md`

## 分发规则

你朋友的工厂是他自己的。他可以在自己的工厂里创建旁系产品、记录优化、决定是否分发给自己的其他产品。

他不能通过这个 share-kit 修改原作者的私人工厂，也不能访问原作者的 Cloudflare、KV、secret 或产品源码。

## 安全检查

分享前或上传 GitHub 前运行：

```powershell
.\tests\validate_share_kit.ps1
```

