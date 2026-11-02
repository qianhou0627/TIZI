# YouYu 自建后台操作教程：qianhou-tizi

适用环境：Windows 电脑、已有 YouYu 项目文件、拥有域名 `52052099.xyz`。

本文按第一次部署、客户端尚未完成“使用登记”的情况编写。每一步都会说明在哪里点击、复制什么、怎样判断成功。生成本文档不代表已经替你部署或修改域名。

## 先确认：youyu-traffic 可以改名吗？

**Cloudflare 上的 Worker 名称可以改成 `qianhou-tizi`，新建部署时不影响后台功能。** Worker 名称与后台域名也可以分别设置，本教程为了方便记忆使用同一个前缀。

但下面几个名称用途不同，不能全部批量替换：

| 项目 | 本教程使用的值 | 说明 |
| --- | --- | --- |
| Cloudflare Worker 名称 | `qianhou-tizi` | 你在 Cloudflare 中看到的后台项目名称 |
| 你拥有的主域名 | `52052099.xyz` | 接入 Cloudflare 时填写这个 |
| 后台使用的子域名 | `qianhou-tizi.52052099.xyz` | 本教程选用的完整域名 |
| 客户端后台地址 | `https://qianhou-tizi.52052099.xyz` | 写进客户端地址文件，不带 `/admin` |
| 浏览器管理入口 | `https://qianhou-tizi.52052099.xyz/admin` | 部署成功后，在浏览器中打开 |
| D1 数据库名称 | `youyu_traffic` | 保留，现有数据库检查脚本依赖这个名称 |
| D1 绑定名称 | `DB` | 保留，后台代码通过它访问数据库 |
| 项目内的后台文件夹 | `cloudflare/youyu-traffic/` | 保留，不需要重命名 |

如果你已经部署过名为 `youyu-traffic` 的 Worker，改成新名称后部署会创建另一个 Worker；原服务不会自动迁移，两个密钥也需要在新 Worker 里重新设置。若尚未部署，直接按本文操作即可。

本文把后台放在子域名上，`52052099.xyz` 根域名可以继续留作其他用途。接入 Cloudflare 时仍需核对原有网站、邮箱等 DNS 记录。

## 第 1 步：登录 Cloudflare

1. 打开浏览器，进入 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 已有账号就登录；没有账号就点击“注册 / Sign up”。
3. 按提示填写邮箱、设置登录密码，并完成邮箱验证。
4. 如果账号下有多个账户，选择你准备用来管理这个域名和后台的账户。

后面的域名、Worker 和数据库都放在同一个 Cloudflare 账户里。

## 第 2 步：让 52052099.xyz 接入 Cloudflare

### 2.1 先看是否已经接入

在 Cloudflare 账户首页，找到“域 / Domains”或“网站 / Websites”列表。

- 如果已经能看到 `52052099.xyz`，并且状态是“有效 / Active”，直接继续第 3 步。
- 如果没有这个域名，或者状态是“待处理 / Pending”，继续本步骤。

**买下域名和把域名接入 Cloudflare 是两件事。** 本教程使用的 Worker 自定义域名，需要域名已在同一账户中激活。[Cloudflare 自定义域名要求](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/#add-a-custom-domain)

### 2.2 添加你的主域名

1. 在 Cloudflare 的域名列表页面，点击“接入域 / Onboard a domain”。有的界面显示“添加域”或“添加网站”。
2. 在域名输入框中填写：

   ```text
   52052099.xyz
   ```

3. 这里不加 `https://`，也不填 `qianhou-tizi` 前缀。
4. DNS 导入方式选择扫描已有记录，继续下一步。
5. 选择适合自己的套餐；初次尝试可选择页面提供的 Free 免费套餐。
6. 检查扫描出的 DNS 记录。如果这个域名已经用于网站、邮箱或其他服务，对照原服务商补齐遗漏记录，保留它们原来的用途。
7. 点击“继续 / Continue”。

Cloudflare 的自动扫描不保证找全已有记录，尤其要核对邮箱相关记录。[官方域名接入步骤](https://developers.cloudflare.com/fundamentals/manage-domains/add-site/)

### 2.3 修改域名的 DNS 服务器

Cloudflare 接下来会显示分配给你的两条名称服务器，通常以 `.ns.cloudflare.com` 结尾。

1. 复制页面实际显示的两条名称服务器，暂时保存好。
2. 新开一个浏览器标签页，登录你购买 `52052099.xyz` 的平台。
3. 找到“域名管理”或“我的域名”。
4. 点击 `52052099.xyz` 旁边的“管理”。
5. 找到“DNS 服务器 / Nameservers / NS 服务器”设置。
6. 选择“自定义 DNS 服务器”一类的选项。
7. 把原来的名称服务器替换为 Cloudflare 刚才分配给你的两条，保存。
8. 回到 Cloudflare，点击“我已更新名称服务器”或“立即检查”。

不同域名购买平台的按钮位置不同，这里无法确定你那家的具体页面。要修改的是域名的“名称服务器”，不是随意新增两条普通 DNS 解析记录。

如果原域名启用了 DNSSEC，需要先在注册商处关闭旧 DNSSEC，再更换名称服务器；Cloudflare 激活后可以按其指引重新启用。[官方名称服务器与 DNSSEC 说明](https://developers.cloudflare.com/fundamentals/manage-domains/add-site/#3-update-nameservers)

**成功标志：** Cloudflare 中 `52052099.xyz` 的状态变成“有效 / Active”。生效需要等待，看到 Pending 时不要反复来回修改。后面绑定自定义域名前，必须先完成激活。

## 第 3 步：安装 Node.js

Node.js 是这次运行部署命令需要的工具。

1. 打开 [Node.js 官方下载页](https://nodejs.org/en/download)。
2. 版本选择 **24.x LTS**。
3. 系统选择 **Windows**，架构选择 **x64**。
4. 点击 **Windows Installer（.msi）**，下载安装程序。
5. 双击下载的 `.msi` 文件。
6. 依次点击“Next”，勾选许可协议，其他安装选项保持默认。
7. 如果出现“自动安装其他工具”的额外选项，这次不用勾选。
8. 点击“Install”，Windows 请求授权时点“是”。
9. 安装完成后点击“Finish”。

如果已经安装了 Node.js 24，可以直接继续下一步检查版本。

## 第 4 步：在项目文件夹打开命令窗口

以下按照你电脑上已有的项目位置操作：

```text
E:\APP\A-Github\APP\YouYu-main
```

1. 按键盘上的 **Win + E**，打开文件资源管理器。
2. 点击顶部显示文件夹位置的地址栏。
3. 粘贴上面的路径，按回车。
4. 确认里面能看到 `package.json`、`src` 和 `cloudflare` 等文件或文件夹。
5. 再次点击顶部地址栏，输入：

   ```text
   cmd
   ```

6. 按回车，会弹出“命令提示符”窗口。

窗口中应显示类似：

```text
E:\APP\A-Github\APP\YouYu-main>
```

**后续命令都粘贴到这个命令提示符窗口。每次只执行一条，按回车后等它结束，再执行下一条。不要把上面路径末尾的 `>` 一起输入。**

如果之后关掉了窗口，重新按本步骤打开即可。

先执行：

```bat
node -v
```

**成功标志：** 出现 `v24.` 开头的版本号。如果提示找不到 `node`，安装完成后关闭命令窗口，再按本步骤重新打开。

## 第 5 步：准备部署依赖

在刚才的命令窗口执行：

```bat
npm ci --ignore-scripts --include=optional
```

这条命令会准备项目依赖，同时跳过本次后台部署不需要的安装脚本，例如 Electron 桌面运行时下载。

等待它执行完毕，窗口重新出现项目路径并等待输入后再继续。下载时间取决于网络。

如果出现 `npm ERR!` 或命令失败，先保留错误信息，不要继续执行后面的部署步骤。

## 第 6 步：授权部署工具连接你的 Cloudflare

在命令窗口执行：

```bat
npx wrangler login
```

1. 浏览器通常会自动打开 Cloudflare 授权页面。
2. 登录第 1 步使用的账号。
3. 确认这是你刚发起的 Wrangler 授权操作。
4. 点击“允许 / Allow”。
5. 回到命令窗口。

**成功标志：** 看到类似 `Successfully logged in` 的提示。

如果浏览器没有自动打开，把命令窗口显示的登录网址复制到浏览器中打开即可。[Cloudflare 官方登录说明](https://developers.cloudflare.com/workers/wrangler/commands/general/#login)

## 第 7 步：在网页上创建数据库

1. 回到 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 选择管理 `52052099.xyz` 的同一个账户。
3. 左侧点击“存储和数据库 / Storage & databases”。
4. 点击“D1 SQL 数据库 / D1 SQL database”。
5. 点击“创建数据库 / Create Database”。
6. 名称填写：

   ```text
   youyu_traffic
   ```

7. 其他选项保持默认，点击“创建 / Create”。
8. 进入刚创建的数据库详情页。
9. 在概览或设置中找到“数据库 ID / Database ID”，点击旁边的复制按钮。
10. 把它暂时保存到记事本，下一步要用。

数据库 ID 是一串带短横线的字符，它不是数据库名称，也不是密码。不要使用原项目配置中现成的数据库 ID。

如果你在前面的操作中已经创建了自己的 `youyu_traffic` 数据库，打开已有数据库复制 ID 即可，不用重复创建。[Cloudflare 官方建库步骤](https://developers.cloudflare.com/d1/get-started/#2-create-a-database)

## 第 8 步：填写 qianhou-tizi 和你的域名配置

切回命令窗口，执行：

```bat
notepad cloudflare\youyu-traffic\wrangler.toml
```

记事本会打开后台配置文件。

1. 按 **Ctrl + A**，选中全部原内容。
2. 用下面这段完整内容替换：

   ```toml
   name = "qianhou-tizi"
   main = "src/index.ts"
   compatibility_date = "2026-05-01"
   workers_dev = true
   preview_urls = false

   [[routes]]
   pattern = "qianhou-tizi.52052099.xyz"
   custom_domain = true

   [triggers]
   crons = ["17 */6 * * *"]

   [[d1_databases]]
   binding = "DB"
   database_name = "youyu_traffic"
   database_id = "这里替换成你自己的数据库ID"
   ```

3. 把最后一行引号里的中文替换成第 7 步复制的数据库 ID，保留两侧的英文双引号。
4. 按 **Ctrl + S** 保存。
5. 关闭记事本。

注意这三处的区别：

- `name = "qianhou-tizi"` 是 Cloudflare 上的新项目名称。
- `pattern = "qianhou-tizi.52052099.xyz"` 是完整域名，不带 `https://`、`/admin` 或 `/*`。
- 命令里的 `cloudflare/youyu-traffic/` 是项目已有文件夹，保留原样。

此配置会在部署时自动申请绑定自定义域名，Cloudflare 负责创建对应 DNS 记录和 HTTPS 证书。**不用先手工新增一个指向 workers.dev 的 CNAME，也不用另外购买证书。** 如果这个子域名已经被其他服务使用，先确认用途，再决定是否让它用于此后台。[官方自定义域名配置说明](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/#set-up-a-custom-domain-in-your-wrangler-configuration-file)

## 第 9 步：初始化新数据库并检查

本步骤用于第 7 步新建的空数据库。若你在接手一个已有用户数据的数据库，不要把它当作全新部署处理。

先在命令窗口完整执行下面这一条：

```bat
npx wrangler d1 execute youyu_traffic --remote --config cloudflare/youyu-traffic/wrangler.toml --file cloudflare/youyu-traffic/schema.sql
```

如果提示选择 Cloudflare 账户，选择域名和数据库所在的账户。

如果提示是否继续执行，确认操作的是自己的新数据库，再输入 `y` 并按回车。

执行结束后，再执行：

```bat
node cloudflare/youyu-traffic/migrations/apply.mjs --remote --check
```

**执行这条检查后，可能会出现只有光标闪烁、没有新文字的情况。** 当前脚本会依次启动约 80 次 Cloudflare 查询，并把中途输出收起来，全部结束后才显示检查结果。因此可能需要数分钟，网络较慢时会更久，不能仅凭光标闪烁判断失败。

如果刚运行不久，先等待，不用继续按回车或重新初始化数据库。如果已经等待较久，例如 5～10 分钟仍没有结果，可以按 **Ctrl + C** 停止这条只读检查；它不会删除前面已经初始化的数据。这里的时间是排查观察时间，不是脚本保证的完成时限。

停止后，可以执行下面这条简单的只读查询，确认数据库连接能否响应：

```bat
npx wrangler d1 execute youyu_traffic --remote --config cloudflare/youyu-traffic/wrangler.toml --command "SELECT 1 AS ok;"
```

如果结果中 `ok` 为 `1`，表示这次数据库连接成功，但不代表完整结构已经检查通过；之后仍需重新执行上面的 `--remote --check` 并等待结果。如果简单查询也一直没有结果或报错，先处理连接问题，不要重跑 `schema.sql` 初始化，也不要跳过检查直接部署。

**成功标志：** 出现下面这行：

```text
[check] remote schema is current
```

新数据库通过检查后，不需要额外运行 `--apply`。如果检查失败，先处理错误，再继续部署。

## 第 10 步：把后台部署到 Cloudflare

先确认两件事：域名状态已经是 Active，配置中的数据库 ID 已替换为你自己的值。

在命令窗口执行：

```bat
npx wrangler deploy --config cloudflare/youyu-traffic/wrangler.toml
```

如果第一次使用 Workers 时提示设置 `workers.dev` 子域名，按页面或命令提示选择一个未被占用的名称即可。这是备用访问地址，不必和你购买的域名相同。

如果提示创建自定义域名或 DNS 记录，确认显示的是：

```text
qianhou-tizi.52052099.xyz
```

确认正确后按提示继续。部署输出中的地址、名称应当属于你的账户。

**成功标志：** 命令正常结束，显示 `qianhou-tizi` 已部署，没有错误。随后在 Cloudflare 的“Workers 和 Pages”列表中能找到这个项目。

这是从电脑直接部署自己的新后台。本文不需要打开原仓库的 GitHub Actions“Deploy Worker”工作流；原工作流仍含原作者环境配置。

## 第 11 步：在网页上核对域名绑定

1. 回到 Cloudflare 控制台的账户首页。
2. 左侧点击“Workers 和 Pages / Workers & Pages”。有的界面把它放在“计算和 AI / Compute & AI”下面。
3. 点击项目 **`qianhou-tizi`**。
4. 点击“设置 / Settings”。
5. 找到“域和路由 / Domains & Routes”。
6. 确认里面已经列出：

   ```text
   qianhou-tizi.52052099.xyz
   ```

第 8 步已经在配置中声明了自定义域名，部署成功后通常会自动出现，**有了就不要再重复添加**。

如果没有出现，先查看第 10 步是否报错，并确认域名已经 Active、Worker 与域名位于同一账户。需要在控制台补加时，路径是“添加 / Add”→“自定义域 / Custom Domain”，填写上面的完整域名，然后点击“添加自定义域 / Add Custom Domain”。本地配置继续保留第 8 步的域名段。[官方控制台点击路径](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/#set-up-a-custom-domain-in-the-dashboard)

如果证书状态仍在签发或等待中，等待完成后再尝试 HTTPS 访问。

## 第 12 步：设置管理令牌和客户端登记口令

仍然在 Cloudflare 的 **`qianhou-tizi`** 项目中操作。

1. 点击“设置 / Settings”。
2. 找到“变量和机密 / Variables and Secrets”。
3. 点击“添加 / Add”。
4. 类型选择 **“机密 / Secret”**。
5. 在“变量名称 / Variable name”中输入：

   ```text
   ADMIN_TOKEN
   ```

6. 在“值 / Value”里填入你自己设置的较长随机密码。这是你的后台管理令牌，保存到密码管理器里。
7. 按页面提示保存；如果可以“添加变量 / Add variable”，继续添加第二项。
8. 第二项的类型也选择 **Secret**，名称输入：

   ```text
   REGISTRATION_PASSPHRASE
   ```

9. 第二项的值设置为另一串密码，它是客户端“使用登记”界面的口令。
10. 点击页面上的“部署 / Deploy”，让机密设置生效。若页面每次只允许添加一个，就分别添加并部署两次。

| 名称，必须原样填写 | 值在哪里使用 |
| --- | --- |
| `ADMIN_TOKEN` | 浏览器管理后台的“管理令牌”输入框 |
| `REGISTRATION_PASSPHRASE` | YouYu 客户端“使用登记”的“口令”输入框 |

名称使用上面的英文，值由你自己设置。不要把 `ADMIN_TOKEN` 这几个字本身当成登录密码，也不要把两个值设成同一个。

Cloudflare 不会在保存后显示机密原值。真实令牌和口令只保存在你自己的密码管理器及 Cloudflare Secret 中，不写进这份教程或项目文件。[官方机密设置步骤](https://developers.cloudflare.com/workers/configuration/secrets/#via-the-dashboard)

## 第 13 步：打开你自己的管理后台

1. 在浏览器打开 [qianhou-tizi 管理后台](https://qianhou-tizi.52052099.xyz/admin)。
2. 找到页面右上方的“管理令牌”输入框。如果输入框收起，先点击“管理令牌”按钮。
3. 填写第 12 步为 `ADMIN_TOKEN` 设置的实际值。
4. 点击“进入”。

**成功标志：** 能看到“概览”“用户”“配置”“异常”等页面。第一次进入时用户列表为空是正常的。

页面刷新或重新打开后，可能需要重新输入管理令牌。

新数据库里的订阅周期日期沿用项目预设。如果需要统计自己的订阅周期，可以点击左侧“配置”→“订阅周期”，根据实际订阅修改流量额度、开始时间和到期时间，点击“保存”。这里是用量统计设置，不是后台部署的到期时间。

## 第 14 步：完全退出电脑上的 YouYu

本教程接下来修改已安装客户端的地址文件，适用于你截图中尚未完成登记的情况。

1. 在 Windows 任务栏右下角点击向上小箭头 **`^`**。
2. 找到 YouYu 图标。
3. 右键点击图标。
4. 点击“退出”。

仅点击主窗口右上角的关闭按钮，应用可能仍留在后台，需要通过托盘退出。

如果客户端以前已在其他后台登记并产生流量，换后台还涉及旧身份和待同步数据，不能把这套新安装流程直接当成数据迁移流程，也不要为此随意删除本地数据。

## 第 15 步：找到已安装客户端的后台地址文件

1. 在桌面找到 YouYu 快捷方式。
2. 右键点击快捷方式，选择“属性”。
3. 在“快捷方式”选项卡中点击“打开文件所在的位置”。
4. 找到包含 `YouYu.exe` 的安装文件夹。
5. 双击里面的 **`resources`** 文件夹。
6. 找到 **`traffic-api-url.txt`**。
7. 先复制这个文件，再粘贴到桌面，留作备份。
8. 回到安装目录中的 `resources` 文件夹。
9. 点击资源管理器顶部地址栏，复制该文件夹的完整路径。

这次要修改的是 **YouYu 安装目录中的文件**。仅修改源码目录 `E:\APP\A-Github\APP\YouYu-main\resources` 下的文件，不会自动改变已经安装的客户端。

如果安装目录中没有这个文件，先停在这里，需要确认你安装的具体版本，不要直接新建文件。

## 第 16 步：用管理员权限修改客户端地址

1. 点击 Windows“开始”，搜索“记事本”。
2. 右键点击搜索结果中的“记事本”。
3. 选择“以管理员身份运行”，系统询问时点击“是”。
4. 在记事本中按 **Ctrl + O**，打开文件选择窗口。
5. 点击文件选择窗口顶部的地址栏，粘贴第 15 步复制的 `resources` 文件夹路径，按回车。
6. 选择 `traffic-api-url.txt`，点击“打开”。
7. 在记事本中按 **Ctrl + A**，选中原内容。
8. 替换成下面这一行：

   ```text
   https://qianhou-tizi.52052099.xyz
   ```

9. 按 **Ctrl + S** 保存，然后关闭记事本。

这个文件里只放后台根地址，**不带 `/admin`，不填管理令牌或登记口令**。如果提示无法保存，确认打开记事本时用了“以管理员身份运行”。

## 第 17 步：重新打开 YouYu，完成登记

1. 双击桌面的 YouYu 快捷方式。
2. 在“姓名”里填写你准备使用的名字。
3. 在“口令”里填写第 12 步为 **`REGISTRATION_PASSPHRASE`** 设置的实际值。
4. 点击“登记”。

客户端登记成功后，回到浏览器的管理后台，点击“刷新数据”或打开“用户”页面，应该能看到刚登记的用户。

**后台部署本身不提供代理节点或订阅。** 完成登记后，还需要在客户端设置中保存你自己的有效订阅地址，才能使用代理。

## 日常使用时记住这些

| 要做什么 | 打开哪里或使用哪个值 |
| --- | --- |
| 进入 Cloudflare 修改服务配置 | [Cloudflare 控制台](https://dash.cloudflare.com/) → Workers 和 Pages → `qianhou-tizi` |
| 进入 YouYu 管理后台 | [https://qianhou-tizi.52052099.xyz/admin](https://qianhou-tizi.52052099.xyz/admin) |
| 管理后台登录 | 使用你保存的 `ADMIN_TOKEN` 的值 |
| 客户端登记 | 使用你保存的 `REGISTRATION_PASSPHRASE` 的值 |
| 客户端后台地址文件 | 只填写 `https://qianhou-tizi.52052099.xyz` |

如果忘记管理令牌，可以登录自己的 Cloudflare 账户，到 `qianhou-tizi` 的“设置”→“变量和机密”中编辑 `ADMIN_TOKEN`，换成新值并部署，然后用新值进入管理后台。登记口令也可在同一位置更换。

以后重新安装或安装官方更新，可能覆盖已安装客户端的后台地址文件。自建后台不会自动更换客户端的官方更新来源；更新后如连接异常，需要核对地址文件。

如果以后需要给其他人分发长期使用的自定义安装包，还需要在源码中配置自己的后台地址，并适配固定原作者域名的打包校验、相关测试及更新配置，再按项目打包流程交付。本教程只讲首次部署和本机接通，不包含重新打包发布。

## 常见问题

| 遇到的情况 | 先检查什么 |
| --- | --- |
| Cloudflare 域名一直是 Pending | 注册商处是否换成了本账户分配的两条名称服务器；原 DNSSEC 是否按要求处理 |
| 部署提示找不到域名、zone 或无权访问 | `52052099.xyz` 是否 Active，是否与 Worker 和数据库位于同一 Cloudflare 账户 |
| 绑定域名时提示 CNAME 冲突 | 是否已有 `qianhou-tizi.52052099.xyz` 的 CNAME；先确认原记录用途，不要盲目删除或覆盖 |
| 数据库命令找不到数据库 | 配置中的 `database_id` 是否为你新建数据库的 ID，数据库名是否保留 `youyu_traffic` |
| 命令窗口提示找不到 node 或 npm | Node.js 是否安装完成；重新打开命令提示符后再检查 |
| `npm ci` 或部署命令失败 | 保存本次错误信息，先解决该步，不要直接继续后续步骤，也不要随意更换镜像或关闭证书校验 |
| 浏览器打开自定义域名失败 | 查看 Worker 的“域和路由”、域名激活状态及 HTTPS 证书状态；不要把根域名自动当成后台入口 |
| 管理后台无法进入 | 使用的是 `ADMIN_TOKEN` 的实际值吗，是否在 `qianhou-tizi` 中设置为 Secret 并部署生效 |
| 客户端显示“口令不对” | 使用的是 `REGISTRATION_PASSPHRASE` 的实际值吗；客户端是否仍指向原后台；修改地址后是否完全退出并重开 |
| 客户端显示连接后台失败或超时 | 先用浏览器测试自己的管理入口能否打开，再核对安装目录地址文件里的 HTTPS 根地址 |
| 客户端登记成功但没有节点 | 是否已经保存自己的有效订阅；部署后台不等于获得代理订阅 |
| 后台显示旧的订阅周期日期 | 左侧“配置”→“订阅周期”，改为自己的实际周期并保存 |

## 完成后逐项核对

- [ ] `52052099.xyz` 在自己的 Cloudflare 账户中为 Active。
- [ ] Worker 名称是 `qianhou-tizi`。
- [ ] 数据库名称保留 `youyu_traffic`，绑定名称保留 `DB`，ID 为自己的数据库 ID。
- [ ] 数据库检查显示 `[check] remote schema is current`。
- [ ] Worker 的自定义域名是 `qianhou-tizi.52052099.xyz`。
- [ ] 两项 Secret 已设置并部署，实际值已自行保存。
- [ ] 能在浏览器中进入自己的 `/admin` 页面。
- [ ] 已安装客户端的地址文件填写了自己的 HTTPS 根地址。
- [ ] 客户端登记成功，后台能看到相同用户。
- [ ] 如需使用代理，客户端已配置自己的有效订阅。
