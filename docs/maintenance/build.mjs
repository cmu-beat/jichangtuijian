import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {profiles,reading,faq} from './editorial.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const data=JSON.parse(await fs.readFile(path.join(root,'docs/maintenance/catalog.json'),'utf8'));
const airports=[...data.airports].sort((a,b)=>a.order-b.order);
const get=id=>airports.find(a=>a.id===id);
const label=a=>a.id==='miaomiao-cloud'?'妙妙云（秒秒云）':a.name;
const cell=v=>String(v??'未明确').replace(/\|/g,'／').replace(/\r?\n/g,' ');
const table=(headers,rows,align=[])=>`| ${headers.join(' | ')} |\n| ${headers.map((_,i)=>align[i]||'---').join(' | ')} |\n${rows.map(row=>'| '+row.map(cell).join(' | ')+' |').join('\n')}`;
const unit={monthly:'月',quarterly:'季',annual:'年','one-time':'次',addon:'次（加油包）','half-year':'半年',biennial:'两年',triennial:'三年'};
const price=p=>`¥${p.price}/${unit[p.kind]}`;
const stars=p=>p.stars?'⭐'.repeat(p.stars):'—';
const regular=a=>a.plans.filter(p=>p.kind!=='addon');
const monthly=a=>regular(a).filter(p=>p.kind==='monthly'&&!(a.id==='mesl'&&/新疆|Enterprise/.test(p.name))).sort((a,b)=>a.price-b.price)[0];
const onetime=a=>regular(a).filter(p=>p.kind==='one-time').sort((a,b)=>a.price-b.price)[0];
const summary=p=>p?`${price(p)} · ${p.traffic}`:'未收录明确方案';
const anchor=id=>`<a id="${id}"></a>`;
const cta=a=>`## [👉 点击进入官网](${a.referral_url})`;
const attr=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const illustration=(a,file)=>a.image?`<p align="center">
  <picture>
    <img src="${attr(path.posix.relative(path.posix.dirname(file),a.image.webp))}" alt="${attr(label(a))}机场介绍配图" width="100%" loading="lazy" decoding="async">
  </picture>
</p>`:'';
function featured(a){
 const all=regular(a);const chosen=[];
 const add=p=>{if(p&&!chosen.includes(p)&&chosen.length<8)chosen.push(p);};
 all.filter(p=>p.kind==='monthly'&&!/新疆|Enterprise|私人定制/.test(p.name)).sort((a,b)=>a.price-b.price).slice(0,4).forEach(add);
 all.filter(p=>p.kind==='one-time').slice(0,2).forEach(add);
 add(all.find(p=>p.kind==='quarterly'));add(all.find(p=>p.kind==='annual'));
 all.forEach(add);return chosen;
}
const planTable=(plans,full=false)=>full?table(['套餐','实付金额／周期','流量规则','设备限制','配置与限制标注','推荐指数'],plans.map(p=>[p.name,price(p),p.traffic,p.devices,p.route,stars(p)]),['---','---:','---','---','---',':---:']):table(['代表套餐','实付金额／周期','流量','推荐指数'],plans.map(p=>[p.name,price(p),p.traffic,stars(p)]),['---','---:','---',':---:']);
function link(file,target,text){const rel=path.posix.relative(path.posix.dirname(file),target);return `[${text}](${rel})`;}
const nav=file=>[link(file,'README.md','🏠 机场推荐首页'),link(file,'docs/README.md','📚 资料索引'),link(file,'docs/comparisons/plan-browser.md','📋 全套餐表'),link(file,'docs/questions.md','❓ 常见问题')].join(' · ');
const legal=file=>`<sub>${data.meta.affiliate_note} 资料仅供参考、学习与工作使用，请遵循所在地法律法规。价格、节点与规则以服务方为准。${link(file,'docs/editorial-policy.md','查看资料与测评说明')}。</sub>`;
async function write(file,content){
 const absolute=path.resolve(root,file);if(!absolute.startsWith(root+path.sep))throw new Error('Unsafe output path');
 await fs.mkdir(path.dirname(absolute),{recursive:true});await fs.writeFile(absolute,content.trim()+'\n','utf8');
}
const counts={airports:airports.length,plans:airports.reduce((n,a)=>n+a.plans.length,0),preview:airports.reduce((n,a)=>n+featured(a).length,0)};

for(const a of airports){
 const e=profiles[a.id];const file=`docs/reviews/${a.id}.md`;
 const same=e.pair.map(id=>get(id)).map(b=>link(file,`docs/reviews/${b.id}.md`,label(b))).join(' · ');
 const addons=a.plans.filter(p=>p.kind==='addon');
 await write(file,`# ${label(a)}机场测评｜${e.title}

${nav(file)}

${illustration(a,file)}

${e.lead}

${cta(a)}

## 01 · 先判断是否适合自己

${table(['判断维度','本版资料与选购方向'],[['本期位置',`第${a.order}位；维护者指定顺序`],['可单独购买的普通月付',summary(monthly(a))],['常规按量起步',summary(onetime(a))],['关注重点',e.tag],['使用人群',e.fit],['需要先排除的条件',e.stop]])}

## 02 · 线路、协议与客户端分析

${e.route}

${a.id==='lingdong'?'**客户端优先判断：** 采用维护者在原资料末尾补充的限制，不支持URL通用订阅，需要官方客户端。已有第三方客户端、路由器或规则工作流的人，应先确认能否接入。':a.id==='freecat'?'**客户端优先判断：** 现有资料明确不支持第三方客户端，使用所在地和用途也有限制。不能只按协议名称推定可自行导入。':a.client||'现有资料没有完整列出当前客户端与协议组合。下单前确认自己的系统、内核、导入方式与服务方后台要求，不能仅凭常见客户端名称推定兼容。'}

## 03 · 代表套餐与选购顺序

${e.buy}

${planTable(featured(a))}

## 04 · 这家机场真正需要比较的取舍

${e.tradeoff}

**适合怎样的使用方式：** ${e.fit}

**遇到这些条件先停下来确认：** ${e.stop}

## 05 · 已收录的套餐价格表

下表保留已有明确金额与周期的方案，不代表当前库存或商店全部可售方案。没有价格的计费方式不补造，定制与地区限定方案按原限制理解。

${planTable(regular(a),true)}

${addons.length?`### 配套加油包｜不作为独立按量机场订阅

需要已有常规套餐，不能纳入独立机场起步价。有效期与叠加条件以下单后台为准。

${planTable(addons,true)}

`:''}## 06 · 付款前问清这三件事

${e.checks.map((q,i)=>`${i+1}. ${q}`).join('\n')}

保存账号、绑定邮箱、订单与官方通知渠道。遇到域名变动时，先确认可信入口；不要把订阅地址、私人信息或订单识别信息贴到公开评论中。

## 07 · 如何验证自己的使用结果

先在常用网络导入订阅，确认一个日常节点和一个备选地区。记录连接是否成功、常用网页和实际任务是否完成，再在经常使用的时段重复观察。测试流量计入套餐，按量和高倍率方案更需要控制重复测速的消耗。

本页没有生成统一网络环境的速度名次；第三方样本、商店配置和本地实测是不同证据。记录自己的城市、运营商、客户端、节点与时段后，再判断是否升档或续费。${link(file,'docs/field-guide/testing.md','阅读机场测评记录方法')}，或使用${link(file,'docs/test-notebook.md','个人测试记录模板')}。

## 08 · 继续比较

备选机场：${same}。它们用于比较需求匹配，不要求一起购买。

${link(file,'docs/comparisons/plan-browser.md',`查看全部${counts.plans}条套餐记录`)} · ${link(file,'docs/comparisons/access-and-limits.md','对照客户端、地区与覆盖规则')} · ${link(file,'README.md#airport-ranking','返回18家完整榜单')}

${legal(file)}`);
}

for(const [id,g] of Object.entries(reading)){
 const file=`docs/field-guide/${id}.md`;
 await write(file,`# ${g.title}\n\n${nav(file)}\n\n${g.lead}\n\n${g.sections.map(([h,p])=>`## ${h}\n\n${p}`).join('\n\n')}\n\n## 下一步怎么读\n\n${link(file,'docs/field-guide/first-airport.md','需求筛选流程')} · ${link(file,'docs/field-guide/billing.md','付款与流量周期')} · ${link(file,'docs/field-guide/testing.md','建立测评记录')} · ${link(file,'docs/comparisons/access-and-limits.md','18家限制对照')}\n\n${legal(file)}`);
}

const comparisonFile='docs/comparisons/plan-browser.md';
await write(comparisonFile,`# 18家机场套餐检索表｜月付、季付、年付与不限时

${nav(comparisonFile)}

共${counts.plans}条明确套餐记录。先选计费方式，再在表内搜索机场名称；表格全部直接展开。这里只比较同类付款方式，不把年付折算、地区限定或加油包混作普通月付起价。

${['monthly','quarterly','annual','one-time','half-year','biennial','triennial','addon'].map(kind=>{
 const rows=airports.flatMap(a=>a.plans.filter(p=>p.kind===kind).map(p=>[link(comparisonFile,`docs/reviews/${a.id}.md`,label(a)),p.name,price(p),p.traffic,stars(p)]));
 return rows.length?`## ${{monthly:'🗓️ 月付',quarterly:'📆 季付',annual:'📒 年付', 'one-time':'🎒 按量与不限时','half-year':'半年付',biennial:'两年付',triennial:'三年付',addon:'⛽ 加油包，不能独立使用'}[kind]}

${table(['机场','套餐','实付总价／周期','流量','推荐指数'],rows,['---','---','---:','---',':---:'])}`:'';
}).filter(Boolean).join('\n\n')}

## 检索时容易看错的四处

- MESL35元、60元是指定地区优化，不是普通Premium入门价。
- 灵动穿云的70GB是年内总量，不能算成每月70GB。
- 极速云保留标称额度与6倍换算；倍率以实际节点为准。
- CocoDuck加油包依赖主套餐，动力港和XSUS存在新购覆盖说明。

${legal(comparisonFile)}`);

const accessFile='docs/comparisons/access-and-limits.md';
await write(accessFile,`# 机场客户端、线路权限与购买限制对照

${nav(accessFile)}

价格相近不表示使用门槛相同。这张表先看不能忽略的条件，再返回对应机场测评核对套餐。表中的未知项保留未知，不以其他品牌的习惯补齐。

${table(['机场','线路与接入要点','最先核对的限制'],airports.map(a=>[link(accessFile,`docs/reviews/${a.id}.md`,label(a)),profiles[a.id].tag,profiles[a.id].checks[0]]))}

## 客户端先分三组

**有明确客户端限制：** 灵动云按维护者补充需官方客户端、不提供URL通用订阅；自由猫明确不支持第三方软件。它们能否配置规则与能否导出URL是两回事。

**有额外配置门槛：** 飞鸟云涉及Hysteria2与IPv6。已有客户端能连接别的机场，不能替代对这项配置的确认。

**当前协议或订阅方式需要核对：** 老猫有协议迁移文字，灵动有宣传协议与样本不一致；其他品牌的客户端支持也以当前后台为准。

## 流量与账户操作先分四类

1. 周期流量：确认自然月、账单日、30天或到期清零规则。
2. 一次性总量：确认账户有效期，不推定用不完就永久保留。
3. 新购覆盖：动力港与XSUS有明确提醒，不能按囤包叠加理解。
4. 依赖主套餐：加油包不独立产生订阅，主套餐有效期与补量失效时间分别确认。

## 专线权限不能跨档套用

西游轻量型月付、星辰低价月付、极客入门与基础档、扬帆LV1和LV2，都不能直接沿用高档专线介绍。WgetCloud基础、优质、精品的在线IP与节点权限也不同。

## 地区与用途优先于低价

飞兔资料有新疆不可用提示；自由猫列有地区与用途限制；WgetCloud同样有地区限制；MESL又有只适用于指定受限地区的特殊方案。地区条件不能由品牌名称或“全球节点”宣传反推。

${legal(accessFile)}`);

const choiceFile='docs/comparisons/decision-cases.md';
await write(choiceFile,`# 六类真实选购问题｜把机场推荐放回具体需求

${nav(choiceFile)}

以下是假设需求下的计算和配置比较，不是伪造的用户案例或实测报告。每个场景只需要从备选中选合适的一家。

## 情景一：每月预算十几元，手机和电脑都用

先比较Flybit15元128GB与西游16元200GB，前者标注IEPL、不限设备，后者标准型含更多流量与8台设备。若只看9元西游轻量型，要接受它不包含高速精品专线的区别。节点在你的网络是否合适，需要自己验证。

## 情景二：一年只偶尔用，但需要一份备用流量

Flybit36元128GB、飞鸟云10元200GB、飞兔云29.9元100GB都属于一次性总量，但配置门槛不同。飞鸟云有IPv6与Hysteria2要求，飞兔有地区和退款限制。低价只有在能接入并接受规则时才有意义。

## 情景三：需要通用订阅，已有路由器规则

先排除现有资料明确限制第三方客户端的方案，再核对协议、内核和订阅格式。灵动与自由猫不能只因价格或出口方向合适就直接买。老猫的协议迁移也可能要求更新配置，先确认迁移成本。

## 情景四：想为目标地区的IP类型付费

可从CocoDuck的家宽落地方向、WgetCloud的专线分层、MESL的节点配置中比较，但必须逐项问清地区、是否共享、是否固定与用途授权。家宽或专线标签不能保证目标平台始终接受连接，也不保证账号自身状态。

## 情景五：看见1200GB很大，想与200GB比较

极速云1200GB按已有6倍规则约对应200GB传输量。换算后，再把价格、3台设备和月度重置与其他200GB月付放在一起看。不要把倍率当作加速倍数，也别忘了实际节点规则可能变化。

## 情景六：流量还没用完，看到另一个套餐想提前买

先核对覆盖规则。动力港提示直接购买不同套餐或重复一次性包可能覆盖原权益；XSUS按新购重置、不叠加。若未确认，不宜把第二次付款当成自动续存一份备用额度。

## 用这张清单复核自己的选择

${table(['问题','可接受后再继续'],[['付款总额','能承受本次完整预付，而不仅是折算月费'],['客户端','能使用所需协议、软件和导入方式'],['设备与地区','同时在线、所在地区与用途均符合规则'],['流量规则','明白重置、到期、倍率与覆盖结果'],['验证方法','愿意先记录实际任务表现，再考虑长周期']])}

${legal(choiceFile)}`);

await write('docs/questions.md',`# 机场推荐与梯子选购问答｜${faq.length}个常见问题\n\n${nav('docs/questions.md')}\n\n从机场套餐、客户端到测评边界，按实际问题查找。\n\n${faq.map(([q,a],i)=>`## ${String(i+1).padStart(2,'0')}. ${q}\n\n${a}`).join('\n\n')}\n\n${legal('docs/questions.md')}`);

await write('docs/test-notebook.md',`# 我的机场使用观察记录｜可复制模板

${nav('docs/test-notebook.md')}

这是待填写模板，所有空白表示尚未记录，不是已完成的测试。只记录自己有证据的结果。

## 测试环境

${table(['项目','填写内容'],[['机场与套餐','待填写'],['测试时间与所在城市','待填写'],['运营商与接入方式','待填写'],['本地基础带宽','待填写'],['客户端、版本和内核','待填写'],['节点地区与协议','待填写'],['当前节点倍率','待填写'],['目标任务与成功条件','待填写']])}

## 重复观察

${table(['样本','环境是否一致','连接与实际任务结果','流量消耗','备注'],Array.from({length:6},(_,i)=>[i+1,'待填写','待填写','待填写','待填写']))}

## 结论如何填写

说明哪个网络、哪个节点和哪项任务符合需求，列出失败样本和未验证条件。不要将未发生的问题填成0%，也不要将单次成功写成长期稳定。

## 公开之前

删除邮箱、订单识别信息、订阅地址、账户密钥和其他私人信息。若公开截图，保留必要测试条件；不把他人的测试当作自己完成的记录。

${legal('docs/test-notebook.md')}`);

await write('docs/editorial-policy.md',`# 资料、排序与机场测评说明

${nav('docs/editorial-policy.md')}

## 版本范围

本版编排于2026-11-08，展示月份2026-11。18家顺序由维护者指定，只适用于v18；不重算主网站评分，不以套餐价格推导机场速度排名。

## 资料优先级

已有服务优先沿用主网站当前结构化套餐资料；主网站未收录的旧版服务沿用项目已有文字与结构化记录。六家新增服务按维护者新增资料整理，明确的套餐面板记录优先于同文件概述价。各条资料原日期与缺项如下，编排月份不等于重新核价。

${table(['机场','采用的资料口径','原资料日期'],airports.map(a=>[label(a),a.source_note,a.source_date||'未提供统一可核价日期']))}

## 本期保留的差异与冲突

- 灵动：维护者末尾补充仅官方客户端优先于早期通用订阅介绍；Trojan宣传与VLESS样本不一致，协议不作确定承诺。
- 老猫：价格来自第三方摘录；协议同时存在旧Trojan样本与后续Vmess迁移文字，以当前后台为准。第三方评论不转化为本站事实结论。
- MESL：面板中的155元年付、72元季付、50元普通月付等优先于前文概述；指定地区优化不算普通最低月付；企业服务保留询价差异。
- XSUS：月付从10元168GB起，续费和新购覆盖规则按原文保留。
- 妙妙云：对应项目现有秒秒云资料，保留原链接与套餐，不增加虚构品牌。
- 极速云：保留标称流量和已有6倍换算，原代表套餐不称作当前商店完整库存。

## 三类证据分别表述

1. 商店配置：表示服务方对价格、节点、设备或用途的说明，不等于完成验证。
2. 第三方样本：只代表其记录条件下的结果；缺少环境时，不能替代统一对比。
3. 自有测试：需要记录环境、时段、节点与方法；本版没有为18家完成统一性能测试，不杜撰可用率、峰值或长期稳定保证。

## 图片与隐私

本版封面与付款方式示意为原创SVG排版。各机场横幅由维护者提供，是品牌介绍插画，不是测速结果；页面使用压缩WebP，并按原比例显示。原始测试截图和剪贴文章不直接公开，避免把账户邮箱、历史性能样本与整篇转载内容混入发布文件。

## 内容维护与生成

README首页由维护者编辑；运行构建脚本只更新配套页面。只有显式传入--write-home才重建首页，手工修改首页后请先备份再使用此选项。套餐数据与原创分析保存在本文件夹内，上传到其他仓库不依赖父项目。

${data.meta.affiliate_note} 套餐与服务规则以服务方当前页面为准。资料仅供参考、学习与工作使用，请遵循所在地法律法规。`);

await write('docs/README.md',`# v18机场选购资料导航

[🏠 返回机场推荐首页](../README.md)

本版按“候选机场 → 套餐比较 → 配置接入 → 使用记录”四个步骤组织资料。首页有完整榜单、${counts.preview}条代表套餐和18家简评，下面的文章负责展开细则。

## 18家机场测评

${airports.map(a=>`- ${a.order}. [${label(a)}](reviews/${a.id}.md)：${profiles[a.id].title}`).join('\n')}

## 三份横向对照

- [全部${counts.plans}条套餐：按付款周期检索](comparisons/plan-browser.md)
- [客户端、地区与购买限制对照](comparisons/access-and-limits.md)
- [六类具体需求的选择比较](comparisons/decision-cases.md)

## 六篇选购与使用手册

${Object.entries(reading).map(([id,g])=>`- [${g.title}](field-guide/${id}.md)`).join('\n')}

## 问答、记录与维护

- [${faq.length}个常见问题](questions.md)
- [个人测评记录模板](test-notebook.md)
- [资料口径与排序说明](editorial-policy.md)
- [更新记录](updates.md)
- [编辑维护与网页上传方法](maintaining.md)

${legal('docs/README.md')}`);

await write('docs/updates.md',`# v18更新记录

## 2026-11-08 · 创建独立文件夹版本

- 按指定顺序整理18家机场，新增灵动、老猫、MESL、飞兔、动力港与XSUS资料。
- 建立${counts.plans}条套餐数据，首页展示${counts.preview}条代表方案；不补造缺失周期或金额。
- 采用全新选购专刊编排，增加18篇详细机场测评、六篇手册、三份对比与${faq.length}问答。
- 新增原始资料冲突处理与客户端限制对照，区分普通月付、地区限定、年内总量和加油包。
- 首页手工维护，独立构建与检查不依赖父项目。文件夹不初始化Git，不配置发布目标。

本记录说明编排工作，不表示所有价格或节点在本月重新核实。`);

await fs.appendFile(path.join(root,'docs/updates.md'),`\n## 2026-11-08 · 发布v18\n\n- 将本版内容发布到[tem-repo](https://github.com/21pounder/tem-repo)，沿用仓库已有提交历史。\n- 分发文件夹保持无Git元数据，发布在独立检出目录进行。\n`,'utf8');

await fs.appendFile(path.join(root,'docs/updates.md'),`\n## 2026-11-08 · 补充18家机场配图\n\n- 首页与18篇独立测评插入对应品牌横幅，页面使用压缩WebP、延迟加载和原图比例。\n- 移除外部站点的名称、入口链接及封面署名，保留本版内部阅读导航。\n- 原始PNG保留在本地，发布仅使用压缩后的横幅文件。\n`,'utf8');

await write('docs/maintaining.md',`# v18编辑与上传说明

## 日常修改

首页README.md可直接编辑。配套页面由maintenance/catalog.json的套餐资料与maintenance/editorial.mjs的原创分析生成，修改这两处后从本版本根目录运行：

\`\`\`powershell
node docs/maintenance/build.mjs
node docs/maintenance/check.mjs
\`\`\`

普通构建不会覆盖首页。若明确要按模板重建首页，先保存手工修改，再运行：

\`\`\`powershell
node docs/maintenance/build.mjs --write-home
\`\`\`

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

本文件夹采用Node.js 18以上的标准模块，无第三方运行依赖。`);

const home=`# 机场推荐与机场测评 2026｜18家机场清单与梯子选购专刊

<picture>
  <img src="images/edition-cover.svg" alt="机场选购观察室 · 18家机场推荐与套餐比较 · 2026-11" width="100%">
</picture>

**更新月份：2026-11** · 18家机场 · ${counts.plans}条套餐记录 · 月付、按量与长期方案分开比较

选机场，先弄清自己需要怎样的连接，再比较哪份套餐更合适。这份**机场推荐**按价格、流量、设备数、客户端、线路权限和付款方式整理18家候选；每篇**机场测评**既列出代表套餐，也解释不同档位的取舍。想找日常梯子、低频备用流量或特定地区的节点，可以沿着下面的需求入口阅读。

📚 [打开本版全部文章](docs/README.md) · [直接查${counts.plans}条套餐](docs/comparisons/plan-browser.md)

> 🧭 **先选需求，再选一家。** 同一场景列出的多家是备选，不需要全部购买。顺位由维护者安排，不是统一实测速率排名。价格与规则可能变化，付款前核对结算页；本月编排不表示所有资料刚刚核实。

[省流推荐](#quick-choice) · [18家完整榜单](#airport-ranking) · [逐家机场测评](#airport-reviews) · [按预算与用途筛选](#decision-desk) · [梯子配置与排查](#toolkit) · [选购问答](#questions)

${anchor('quick-choice')}

## 🧭 省流推荐｜从你的使用习惯出发

${table(['你最看重什么','先比较这些备选','先看的方案','决定前看一眼'],[
 ['⚡ 性价比','[Flybit](#flybit) 或 [西游云](#xiyou)','Flybit ¥15/月128GB；西游 ¥9/月120GB','西游低价档与标准型专线权限不同'],
 ['🍜 便宜量大','[西游云](#xiyou) 或 [星辰云](#xingchen-cloud)','西游 ¥16/月200GB；星辰 ¥17/月200GB','低价与专线资料分档核对'],
 ['💎 出口与高端配置','[CocoDuck](#cocoduck) 或 [WgetCloud](#wgetcloud)','CocoDuck ¥17/月100GB；Wget ¥99/月230GB','家宽落地与专线分层是不同关注方向'],
 ['🎒 低频按量','[Flybit](#flybit)','¥36/次128GB；¥68/次256GB','总量用完为止，非每月到账'],
 ['🎒 低频按量','[星辰云](#xingchen-cloud)','¥98/次300GB；¥199/次1000GB','IEPL标注；一次性总量，非每月到账'],
 ['📱 自有客户端与规则','先看[客户端限制表](docs/comparisons/access-and-limits.md)','灵动、自由猫先确认官方客户端要求','飞鸟云另有IPv6与Hysteria2门槛'],
 ['🗓️ 低频年内方案','[灵动云](#lingdong) 或其他年付小档','穿云 ¥99/年70GB总量','年内总量与每月重置的年付不同']
 ])}

**第一次买机场，从这里开始：** [七步选购流程](docs/field-guide/first-airport.md) → [计费方式说明](docs/field-guide/billing.md) → [按具体需求比较](docs/comparisons/decision-cases.md)。

${anchor('airport-ranking')}

## 🏆 完整机场榜单｜18家顺序一次看全

${table(['排名','机场 · 点击读本页测评','普通月付起步参考','选择前最重要的区别'],airports.map(a=>[a.order,`[${label(a)}](#${a.id})`,summary(monthly(a)),profiles[a.id].tag]),[':---:','---','---','---'])}

💡 MESL地区优化不算普通月付起步；各家完整周期、按量和加油包见后面的价格表。“妙妙云”对应项目现有“秒秒云”资料，本版标注两种名称。

🔐 **保存账号、密码、邮箱、订单与官方通知渠道。** 收藏本资料库，便于查找变更后的机场入口；不要公开完整订阅地址。

${anchor('airport-reviews')}

## 📖 逐家机场测评｜读懂套餐背后的选择

首页共展示${counts.preview}条代表套餐。每家优先列3–4档月付、2档按量与有记录的长期周期，具体数量按已有方案安排；完整配置、全部套餐和购买前问题在独立详情页展开。

${airports.map(a=>{const e=profiles[a.id];return `${anchor(a.id)}

## ${String(a.order).padStart(2,'0')} · ${label(a)}｜${e.title}

${illustration(a,'README.md')}

${e.lead}

${cta(a)}

**💰 怎么选套餐：** ${e.buy}

${planTable(featured(a))}

**🔎 这家机场测评看什么：** ${e.route}

**⚖️ 还要算清的账：** ${e.tradeoff}

**🎯 适合怎样使用：** ${e.fit}

**🧩 是否匹配你的条件：** ${e.stop}

**📌 付款前核对：**

${e.checks.map(q=>`- ${q}`).join('\n')}

[展开${label(a)}完整机场测评与全部套餐](docs/reviews/${a.id}.md) · [回到18家机场榜单](#airport-ranking)

---`;}).join('\n\n')}

${anchor('decision-desk')}

## 💼 选购决策台｜把价格、额度和使用条件放在一起

### 01 · 月预算很低，先压缩候选范围

自由猫6元30GB只适合接受指定客户端和1台设备的小用量需求；动力港8元100GB与星辰8元80GB各有不同设备和售后条件；西游9元120GB的轻量型不含高速精品专线。便宜机场并非同一种产品，先排除不符合所在地、客户端与用途的方案，再比较流量。

### 02 · 十几元预算，通常需要看线路权限

Flybit15元128GB标注IEPL，西游16元200GB标准型与星辰17元200GB标准版也有专线相关资料。CocoDuck17元100GB则更偏向家宽落地需求。相同预算里可能是额度、节点类型或设备规则的取舍，不把这些标签直接排成性能高低。

### 03 · 高预算不等于越贵越适合

WgetCloud99元月付起，MESL普通Premium50元200GB起，极客39.99元标准版开始看IPLC权限。先写目标地区、设备与所需配置，再看该档实际提供什么。没有明确需求时，价格高并不能替代对本地连接表现的验证。

### 04 · 备用流量按累计使用量估算

先问自己几个月一共会用多少GB，而不是每月愿意花多少钱。一次性包通常没有月度补充，但还可能有账户期限、覆盖和不叠加规则；动力港、XSUS尤其要先问清。按量便宜也不能忽略飞鸟云的配置门槛。

### 05 · 年付之前先算完整预付

77元全年、155元全年、72元一季与20元一个月描述不同付款承诺。长期折算值只能用于平均成本比较，不能成为可单月购买的宣传价。灵动99元70GB/年还是年内总量，更不能与每月重置70GB混用。

### 06 · 多设备要看统计对象

设备数、在线IP与连接数是三项规则，不能互相换算。WgetCloud列在线IP和连接数，极客、扬帆与秒秒逐档列设备数，自由猫小档只有1台。先数真实同时在线需求，再决定是否升档。

### 07 · 倍率统一后才好比流量

极速云1200GB按6倍约对应200GB实际传输量；1800GB约300GB。先换算，再和其他月付档比较，同时确认实际节点倍率。大额数字、低倍率或高带宽都只说明一部分条件。

### 08 · 协议变化会改变接入成本

老猫的资料有Trojan与Vmess迁移记录，灵动的宣传协议与样本也不一致。已有配置能否继续使用、是否必须换客户端、订阅是否会覆盖原规则，都是实际成本。先确认这些，再评价套餐便不便宜。

[📋 查完整套餐](docs/comparisons/plan-browser.md) · [🧩 查设备与限制](docs/comparisons/access-and-limits.md) · [🧮 看六个选择情景](docs/comparisons/decision-cases.md)

## 🗓️ 付款方式小抄｜买之前看懂权益

<picture>
  <img src="images/payment-map.svg" alt="机场套餐计费方式：周期订阅、一次性总量、依赖主套餐的加油包" width="100%" loading="lazy" decoding="async">
</picture>

${table(['方案','购买的是什么','最容易误解的地方'],[['月付','当期有效期与对应配额','续费不一定立即重置流量'],['季付／年付','完整周期预付，配额按记录规则发放','折算月费不能单月购买'],['年内总量','有效期内共用一份总流量','不是每月重复到账'],['不限时包','一次性总量，用完再按规则续','不等于可叠加或永久经营保证'],['加油包','已有订阅的额外流量','不能独立变成机场账号订阅']])}

**一个简单计算：** 若只需128GB总量，分散在三个月，Flybit36元128GB按量与三个15元月付的45元是两种权益。如果每个月都需要128GB，三个月总量就变成384GB，不能继续用36元覆盖全部需求。先明确用量，再选付费方式。

${anchor('toolkit')}

## 🧰 梯子配置与使用工具箱

### 第一步：确认客户端路线

已经用Clash类或其他第三方客户端的人，先确认机场是否提供可用订阅。灵动与自由猫有指定客户端限制，飞鸟云有协议和IPv6门槛。官方客户端能配置规则，不等于可以导出URL给其他软件。

### 第二步：确认导入的是正确内容

注册链接、账号后台、订阅链接和单节点配置不是同一个地址。导入时使用后台给出的对应格式，保留完整参数；如果协议发生迁移，更新客户端和订阅，不在旧配置上无限重试。

### 第三步：先验证实际任务

节点显示在线后，检查常用网页和目标任务是否完成。延迟低不能代替吞吐，其他网站能打开也不代表每个流媒体和AI平台可用。记录自己的网络、节点与时段，再判断是否需要换地区。

### 第四步：按范围排查问题

只有一个节点失败，先换同地区备选；只有一个网络失败，先做本地网络对照；全部节点失败，再检查账户、到期、额度、协议和公告。续费前确认是流量问题还是配置问题，避免花钱仍未解决。

### 第五步：工单写清条件

提供套餐、系统、客户端版本、发生时段、受影响节点和已尝试的步骤。只在可信私密渠道提交必要账户资料，不把完整订阅、邮箱和订单标识放进公开Issue。

**继续阅读：** [客户端与订阅手册](docs/field-guide/clients.md) · [线路术语与倍率](docs/field-guide/routes.md) · [故障排查](docs/field-guide/troubleshooting.md)

## 🔬 怎样读机场测评，才不被单次峰值带偏

本版将商店配置、第三方样本与自己的测试记录分开。写有专线、家宽或最高带宽，只说明一类配置方向；没有城市、运营商、时段、客户端和节点信息的截图，很难解释你自己的体验。

真正有用的观察，是在常用网络和时段完成同一项任务，并同时记录成功与失败。测速会消耗流量，高倍率与按量方案尤其要控制测试量。逐家文章侧重套餐选择和配置取舍；实际表现可以参照下面的方法建立自己的记录。

[阅读机场测评记录方法](docs/field-guide/testing.md) · [复制自己的观察记录表](docs/test-notebook.md)

${anchor('questions')}

## ❓ 机场推荐与梯子选购：先回答这16个问题

${faq.filter((_,i)=>[0,1,2,4,5,6,7,8,10,11,15,18,20,23,26,33].includes(i)).map(([q,a])=>`### ${q}\n\n${a}`).join('\n\n')}

[查看完整${faq.length}个常见问题](docs/questions.md)

## 📚 本版阅读路线

**想立刻筛选：** [18家机场榜单](#airport-ranking) → [按具体需求比较](docs/comparisons/decision-cases.md) → 对应机场测评。

**想把套餐算清楚：** [付款周期手册](docs/field-guide/billing.md) → [${counts.plans}条完整套餐表](docs/comparisons/plan-browser.md) → [设备与限制表](docs/comparisons/access-and-limits.md)。

**想自己做机场测评：** [测试方法](docs/field-guide/testing.md) → [记录模板](docs/test-notebook.md) → [故障排查](docs/field-guide/troubleshooting.md)。

## 📝 集中资料说明

本版本编排月份为2026-11，保留已有资料的实际日期和未知项。老猫价格来自第三方摘录，MESL采用所附面板价，灵动采用维护者补充的客户端限制；详细口径见[资料与排序说明](docs/editorial-policy.md)。原始剪贴文章、账号邮箱与未经整理的截图不直接公开。

${legal('README.md')}

[更新记录](docs/updates.md) · [全部资料索引](docs/README.md) · [返回顶部](#quick-choice)
`;
if(process.argv.includes('--write-home'))await write('README.md',home);

await write('images/edition-cover.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 310" role="img" aria-labelledby="t d">
<title id="t">机场选购观察室</title><desc id="d">18家机场推荐、机场测评与梯子选购，2026年11月专刊</desc>
<rect width="1200" height="310" rx="22" fill="#f3ead9"/><path d="M850 0h328a22 22 0 0 1 22 22v266a22 22 0 0 1-22 22H850z" fill="#213c39"/>
<path d="M44 57h72" stroke="#bc562c" stroke-width="6"/><text x="137" y="65" fill="#86513c" font-size="22" font-family="sans-serif" letter-spacing="3">AIRPORT / FIELD NOTES</text>
<text x="44" y="146" fill="#243a36" font-size="61" font-weight="700" font-family="sans-serif">机场选购观察室</text>
<text x="46" y="203" fill="#53635b" font-size="25" font-family="sans-serif">先看需求，再挑套餐；把每一笔预付算清楚。</text>
<path d="M46 242h748" stroke="#c9b99d"/><text x="46" y="277" fill="#6c6659" font-size="22" font-family="sans-serif">机场推荐 · 机场测评 · 梯子配置</text>
<text x="891" y="87" fill="#f2d0a0" font-size="24" font-family="sans-serif">2026 / 11</text><text x="886" y="204" fill="#f8efdf" font-size="110" font-weight="700" font-family="sans-serif">18</text><text x="892" y="259" fill="#d0dfcf" font-size="25" font-family="sans-serif">家机场 · 选购专刊</text></svg>`);
await write('images/payment-map.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 220" role="img" aria-labelledby="t">
<title id="t">三种机场套餐权益的区别</title><rect width="1200" height="220" rx="18" fill="#f3ead9"/>
<g font-family="sans-serif"><path d="M400 30v160M800 30v160" stroke="#c9b99d"/>
<g fill="#243a36" font-size="32" font-weight="700"><text x="34" y="67">01 周期订阅</text><text x="434" y="67">02 一次性总量</text><text x="834" y="67">03 配套加油包</text></g>
<g fill="#5b6256" font-size="23"><text x="34" y="119">支付有效期内的套餐权益</text><text x="34" y="160">核对重置日与到期规则</text><text x="434" y="119">买一份流量，按使用扣除</text><text x="434" y="160">核对有效期与叠加方式</text><text x="834" y="119">给已有主套餐补充流量</text><text x="834" y="160">不能代替独立机场订阅</text></g></g></svg>`);
console.log(JSON.stringify({...counts,homeWritten:process.argv.includes('--write-home')},null,2));
