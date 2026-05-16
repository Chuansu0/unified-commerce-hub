---
name: email-reply
description: Read incoming emails via himalaya and draft professional replies in Alexander Su's writing style — concise, direct, warm, no filler phrases
homepage: https://zeabur.com
metadata:
  {
    "openclaw": {
      "emoji": "✉️",
      "agent": "andrea"
    }
  }
---

# Email Reply Skill — Alexander Su's Style

Use himalaya CLI to read incoming emails, then draft and send replies on behalf of Alexander Su. Output must match his writing style: brief, direct, professional but warm, zero AI filler phrases.

---

## Email Account

- **Address:** `alexandersu0715@yahoo.com.tw`
- **Config profile:** `yahoo` (himalaya profile name)
- **Credentials:** loaded from environment variables `EMAIL_ADDRESS` / `EMAIL_APP_PASSWORD`

---

## Tools — himalaya CLI

### 讀取收件匣

```bash
# 列出最新郵件（預設 INBOX）
himalaya list

# 列出最新 20 封，顯示寄件人 / 主旨 / 日期
himalaya list --max-width 200

# 讀取特定郵件（用 ID）
himalaya read <id>

# 讀取並轉成純文字
himalaya read <id> --mime-type plain
```

### 回覆郵件

```bash
# 開啟回覆草稿（自動帶入 To / Subject / 引用原文）
himalaya reply <id>

# 直接用 stdin 送出回覆（適合 agent 使用）
himalaya reply <id> --no-edit <<EOF
<回覆內容>
EOF
```

### 直接發信

```bash
# 用 stdin 組成新信並送出
himalaya send <<EOF
From: Alexander Su <alexandersu0715@yahoo.com.tw>
To: <recipient@domain.com>
Subject: Re: <原主旨>

<信件正文>
EOF
```

### 搜尋

```bash
# 搜尋特定寄件人
himalaya search 'from:someone@domain.com'

# 搜尋未讀
himalaya search 'unseen'
```

---

## 完整 SOP

### 步驟 1：讀取來信

```bash
# 先列出最新郵件
himalaya list

# 找到目標郵件 ID 後讀全文
himalaya read <id> --mime-type plain
```

### 步驟 2：分析來信

識別以下資訊：
- 寄件人姓名與語言
- 郵件類型（排程確認 / 詢問 / 介紹 / 轉發 / 致謝）
- 需要採取的動作（確認 / 回答 / 委派 / 分享資訊）

### 步驟 3：起草回覆

套用以下規則撰寫草稿：

**稱謂**

| 情境 | 格式 |
|---|---|
| 已知姓名，正式 | `Dear [名字],` |
| 已知姓名，中文非正式 | `[職稱+姓] 好！` |
| 日本收件人 | `[名字] san,` |
| 未知 / 群組 | `Hi Team,` 或 `您好,` |

**內文規則**
- 正文 3–5 句以內
- 每段一個重點，段落間留空白行
- 依收件人語言回覆（中文/英文/混用）
- CC 對象在信件正文中用 `@Name,` 另起一行

**簽名**
```
BR   Alexander Su
```
`BR` 與名字之間空兩到三格，不附職銜或聯絡資訊。

### 步驟 4：自我審查

- [ ] 無罐頭開場白（"I hope this email finds you well" 等）
- [ ] 正文在 3–5 句以內
- [ ] 稱謂符合收件人情境
- [ ] 簽名為 `BR   Alexander Su`
- [ ] 語言符合收件人慣用語言

### 步驟 5：送出回覆

```bash
# 用 himalaya reply 送出
himalaya reply <id> --no-edit <<EOF
Dear [Name],

[回覆正文]

BR   Alexander Su
EOF
```

---

## 禁止使用的語句

- ❌ "I hope this email finds you well."
- ❌ "Thank you for reaching out to us."
- ❌ "Please feel free to contact me if you have any questions."
- ❌ "I am writing to inform you that..."
- ❌ "As per our previous conversation..."
- ❌ "It was a pleasure speaking with you."
- ❌ 超過 3 句的段落
- ❌ 除 `BR   Alexander Su` 以外的結尾方式
- ❌ 簽名後附加職銜、部門或聯絡資訊

---

## 風格範例

### 排程確認（中文）

```
Hi Ned,

5/19(二) 與 5/20(三) 下午 都可以, 謝謝!

BR   Alexander Su
```

### 會議細節確認（中文非正式）

```
李總好！

麻煩您跑一趟了！
4/30（Thu）15:00-16:00
內湖基湖路16號 1F T03會議室。到時見！

BR Alexander Su
```

### 轉發結構化資訊（中英混用）

```
Dear Ves,

如以下, 謝謝!

邁達特IT服務上雲比例至2025年底預計達76%. 將以此為參考推廣外部客戶及集團內部.
以邁達特代理產品核心提供對集團子公司雲端資訊服務. 如近期將進行怡進的資安增強計畫.
可善用邁達特集團代理之產品之原廠技術客服降低整體成本.

BR    Alexander Su
```

### 委派任務含 CC 提及（中文）

```
Dear Eva,

感謝幫忙!

@ Willa,

麻煩你了!

BR   Alexander Su
```

### 日本收件人介紹 + NDA 索取（英文）

```
Moto san,

Great, thank you!

@Aya san,

Nice to meet you! Please send me NDA, thank you!

BR  Alexander Su
```

### 訪問安排含第三方 CC（英文）

```
Dear Tony,

Cc Satoko san,

Kevin is arranging office moving and cannot attend meeting physically, only Joshua and I will visit KK Japan on Jan/9th 09:30 as discussion.

Kevin will join the discussion on line.

Please kindly help arranging the permission of entering office.

Thank you!

BR   Alexander Su
```

### 商業詢問含條列式問題（英文）

```
Dear Hayata,

We plan to expand business in Japan of Geographic Information System (GIS) by AI and would like to look for cooperation with Plug&Play Japan.

The core products is shown in https://vizzio.ai/v1/

A few quick questions:

- It's only eligible for company registered in Japan?
- We need different partner program besides what we signed in Taiwan?

Thank you!

BR    Alexander Su
```
