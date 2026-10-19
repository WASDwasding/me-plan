/**
 * 任务数据。改进度、增删任务、新增支线，都改这个文件。
 *
 * 结构：
 *   branches[]              并行支线（主进程分出的线程）
 *     children[]            一级子任务
 *       children[]          二级叶子，最小执行单元
 *         id                全局唯一。本机进度按 id 保存，改 id 等于另起一条
 *         name              页面上的名称
 *         status            "todo" 待完成 | "active" 进行中 | "done" 已完成
 *
 * 权重：
 *   待完成 0，进行中 0.5，已完成 1。
 *   父节点 = 直接子节点进度的加权平均。默认每个子节点权重为 1。
 *   总进度 = 各支线进度的加权平均。默认每条支线权重为 1（等权，与叶子数量无关）。
 *   某个节点如果要更重要，加 weight: 2 这样的正数即可。
 *
 * 更深的层级：不要给它 status，改成继续放 children。渲染按树递归。
 * 页面上点击叶子会写入 localStorage，并覆盖这里同一个 id 的预设。
 * 想完全回到本文件：页脚「重置为代码预设」。
 *
 * 下面这组 status 是起始快照，方便第一次打开就能看到汇总。
 * 跟你的真实进度不一致时，直接改 status，或在页面上点。
 */
window.PLAN = {
  goal: "韩国 TOP 高校计算机硕士申请全流程进度",
  schools: ["延世大学", "浦项工科大学"],
  degree: "计算机硕士",
  profile: [
    { label: "绩点", value: "3.12 / 5.0" },
    { label: "语言", value: "韩语最高级" },
    { label: "背景", value: "软件工程本科" },
  ],
  branches: [
    {
      id: "ielts",
      code: "01",
      name: "雅思 7.0 语言达标",
      brief: "词汇、听说读写专项、模考、真题冲刺、总分达标",
      children: [
        {
          id: "ielts.vocab",
          name: "词汇",
          children: [
            { id: "ielts.vocab.core", name: "学术核心词汇滚动掌握", status: "done" },
            { id: "ielts.vocab.syn", name: "同义替换与写作词伙", status: "active" },
            { id: "ielts.vocab.cs", name: "计算机学科词汇补强", status: "todo" },
          ],
        },
        {
          id: "ielts.skill",
          name: "听说读写专项",
          children: [
            { id: "ielts.skill.listen", name: "听力：场景精听与同义定位", status: "active" },
            { id: "ielts.skill.read", name: "阅读：限时检索与判断题", status: "todo" },
            { id: "ielts.skill.write", name: "写作：Task 2 论证结构与范文拆解", status: "todo" },
            { id: "ielts.skill.speak", name: "口语：Part 2–3 话题卡与录音回听", status: "todo" },
          ],
        },
        {
          id: "ielts.mock",
          name: "模考",
          children: [
            { id: "ielts.mock.full", name: "学术类全真模考至少 4 次", status: "todo" },
            { id: "ielts.mock.review", name: "错题归因，弱项题型回炉", status: "todo" },
          ],
        },
        {
          id: "ielts.past",
          name: "真题冲刺",
          children: [
            { id: "ielts.past.cam", name: "剑雅近期套题限时训练", status: "todo" },
            { id: "ielts.past.cbt", name: "机考界面与打字速度适应", status: "todo" },
          ],
        },
        {
          id: "ielts.goal",
          name: "总分达标",
          children: [
            { id: "ielts.goal.sub", name: "单科底线稳住 6.5", status: "todo" },
            { id: "ielts.goal.total", name: "总分稳定在 7.0", status: "todo" },
          ],
        },
      ],
    },
    {
      id: "research",
      code: "02",
      name: "科研背景补足",
      brief: "实验室投递、导师套磁、科研助理、课题参与、履历填充",
      children: [
        {
          id: "research.lab",
          name: "实验室投递",
          children: [
            { id: "research.lab.list", name: "校内与目标方向实验室清单", status: "done" },
            { id: "research.lab.send", name: "研究兴趣说明与简历投递", status: "active" },
            { id: "research.lab.follow", name: "回复跟进与面试", status: "todo" },
          ],
        },
        {
          id: "research.mail",
          name: "导师套磁",
          children: [
            { id: "research.mail.map", name: "延世 / POSTECH 导师方向对照", status: "todo" },
            { id: "research.mail.send", name: "精读近期论文后写套磁邮件", status: "todo" },
            { id: "research.mail.meet", name: "线上短谈与后续问题", status: "todo" },
          ],
        },
        {
          id: "research.ra",
          name: "科研助理",
          children: [
            { id: "research.ra.apply", name: "RA / 科研实习岗位申请", status: "todo" },
            { id: "research.ra.log", name: "实验记录与周报习惯", status: "todo" },
          ],
        },
        {
          id: "research.topic",
          name: "课题参与",
          children: [
            { id: "research.topic.join", name: "加入在研课题并划定个人模块", status: "todo" },
            { id: "research.topic.own", name: "承担一段可复述的技术职责", status: "todo" },
          ],
        },
        {
          id: "research.cv",
          name: "科研履历填充",
          children: [
            { id: "research.cv.note", name: "整理问题、方法与个人贡献", status: "todo" },
            { id: "research.cv.write", name: "写入 CV 的 Research 段", status: "todo" },
          ],
        },
      ],
    },
    {
      id: "paper",
      code: "03",
      name: "学术成果产出",
      brief: "论文撰写、投稿、EI 检索、软著、专利申报",
      children: [
        {
          id: "paper.write",
          name: "论文撰写",
          children: [
            { id: "paper.write.topic", name: "选题、问题定义与文献矩阵", status: "active" },
            { id: "paper.write.exp", name: "方法实现与实验", status: "todo" },
            { id: "paper.write.draft", name: "成稿、内审与修改", status: "todo" },
          ],
        },
        {
          id: "paper.sub",
          name: "投稿",
          children: [
            { id: "paper.sub.list", name: "目标会议 / 期刊清单（含级别）", status: "todo" },
            { id: "paper.sub.send", name: "格式调整与投稿", status: "todo" },
            { id: "paper.sub.rebut", name: "审稿意见回复", status: "todo" },
          ],
        },
        {
          id: "paper.ei",
          name: "EI 检索",
          children: [
            { id: "paper.ei.check", name: "确认会议或期刊的 EI 检索资格", status: "todo" },
            { id: "paper.ei.id", name: "录用通知与检索号归档", status: "todo" },
          ],
        },
        {
          id: "paper.soft",
          name: "软著",
          children: [
            { id: "paper.soft.doc", name: "代码、说明书与申请表", status: "todo" },
            { id: "paper.soft.cert", name: "登记提交与证书归档", status: "todo" },
          ],
        },
        {
          id: "paper.patent",
          name: "专利申报",
          children: [
            { id: "paper.patent.disc", name: "技术交底书", status: "todo" },
            { id: "paper.patent.file", name: "申请文件提交", status: "todo" },
          ],
        },
      ],
    },
    {
      id: "project",
      code: "04",
      name: "研究型项目搭建",
      brief: "算法 / 数据库 / 视觉择一做深，弥补应用型项目",
      children: [
        {
          id: "project.init",
          name: "立项",
          children: [
            { id: "project.init.dir", name: "确定主线：算法、数据库或视觉", status: "active" },
            { id: "project.init.prob", name: "问题定义、相关工作与成功标准", status: "todo" },
            { id: "project.init.plan", name: "技术路线与实验设计", status: "todo" },
          ],
        },
        {
          id: "project.dev",
          name: "开发",
          children: [
            { id: "project.dev.base", name: "基线复现", status: "todo" },
            { id: "project.dev.core", name: "核心模块实现", status: "todo" },
            { id: "project.dev.ablate", name: "对照实验与消融", status: "todo" },
          ],
        },
        {
          id: "project.retro",
          name: "复盘",
          children: [
            { id: "project.retro.result", name: "结果分析与失败记录", status: "todo" },
            { id: "project.retro.doc", name: "技术文档与可复现说明", status: "todo" },
          ],
        },
        {
          id: "project.ship",
          name: "落地",
          children: [
            { id: "project.ship.repo", name: "仓库、依赖与一键运行脚本", status: "todo" },
            { id: "project.ship.demo", name: "短报告或 Demo", status: "todo" },
          ],
        },
        {
          id: "project.cv",
          name: "写入 CV",
          children: [
            { id: "project.cv.quant", name: "用问题、方法、结果写量化描述", status: "todo" },
            { id: "project.cv.fit", name: "表述与目标导师方向对齐", status: "todo" },
          ],
        },
      ],
    },
    {
      id: "contest",
      code: "05",
      name: "高含金量竞赛履历",
      brief: "备赛、刷题、冲刺获奖、履历包装",
      children: [
        {
          id: "contest.prep",
          name: "备赛",
          children: [
            { id: "contest.prep.pick", name: "选定与计算机硕士匹配的赛事", status: "active" },
            { id: "contest.prep.team", name: "读规则、排赛程、完成组队", status: "todo" },
          ],
        },
        {
          id: "contest.train",
          name: "刷题",
          children: [
            { id: "contest.train.topic", name: "专题训练：数据结构、图论、DP", status: "todo" },
            { id: "contest.train.sim", name: "计时模拟赛", status: "todo" },
          ],
        },
        {
          id: "contest.race",
          name: "冲刺获奖",
          children: [
            { id: "contest.race.go", name: "正式参赛", status: "todo" },
            { id: "contest.race.proof", name: "证书与成绩证明归档", status: "todo" },
          ],
        },
        {
          id: "contest.cv",
          name: "履历包装",
          children: [
            { id: "contest.cv.level", name: "写清奖项级别与个人贡献", status: "todo" },
            { id: "contest.cv.write", name: "写入 CV 的 Honors 段", status: "todo" },
          ],
        },
      ],
    },
    {
      id: "apply",
      code: "06",
      name: "申请材料与文书",
      brief: "CV、PS、推荐信、公证、院校调研、投递",
      children: [
        {
          id: "apply.cv",
          name: "CV 打磨",
          children: [
            { id: "apply.cv.struct", name: "改成研究导向结构", status: "active" },
            { id: "apply.cv.en", name: "英文量化表述打磨", status: "todo" },
          ],
        },
        {
          id: "apply.ps",
          name: "PS 撰写",
          children: [
            { id: "apply.ps.story", name: "收成一条研究兴趣主线", status: "todo" },
            { id: "apply.ps.fit", name: "延世 / POSTECH 匹配段落", status: "todo" },
            { id: "apply.ps.rev", name: "多轮修改与外审", status: "todo" },
          ],
        },
        {
          id: "apply.rec",
          name: "推荐信",
          children: [
            { id: "apply.rec.who", name: "确定推荐人，学术推荐优先", status: "todo" },
            { id: "apply.rec.pack", name: "提供素材包与时间表", status: "todo" },
            { id: "apply.rec.track", name: "提交系统跟进", status: "todo" },
          ],
        },
        {
          id: "apply.legal",
          name: "材料公证",
          children: [
            { id: "apply.legal.doc", name: "成绩单、在读或学位证明", status: "todo" },
            { id: "apply.legal.trans", name: "翻译与公证", status: "todo" },
          ],
        },
        {
          id: "apply.school",
          name: "院校调研",
          children: [
            { id: "apply.school.yonsei", name: "延世 CSE：要求、语言、截止日期", status: "todo" },
            { id: "apply.school.postech", name: "POSTECH CSE：要求、语言、截止日期", status: "todo" },
            { id: "apply.school.diff", name: "两校导师、材料、流程差异对照", status: "todo" },
          ],
        },
        {
          id: "apply.send",
          name: "投递准备",
          children: [
            { id: "apply.send.form", name: "网申账号与表格草稿", status: "todo" },
            { id: "apply.send.check", name: "材料清单终检", status: "todo" },
            { id: "apply.send.submit", name: "按截止日期提交", status: "todo" },
          ],
        },
      ],
    },
  ],
};
