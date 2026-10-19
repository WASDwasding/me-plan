/**
 * 总目标在中间，五条支线从两边长出去。
 * 点进一条支线，看到的是它自己的分解树。
 *
 * 叶子 status：todo 待完成 / active 进行中 / done 已完成
 * 父节点进度 = 直接子节点的平均。总进度 = 五条支线的平均。
 * 想让某一支更重，加 weight: 2。
 *
 * 页面上点过的状态记在本机（me-plan.status.v2），同一个 id 以本机为准。
 * 把项目名改成你自己的：直接改下面的 name。
 */
window.PLAN = {
  main: "硕士申请",
  branches: [
    {
      id: "gpa",
      name: "绩点",
      fact: "3.12 / 5.00",
      emphasis: true,
      side: "left",
      x: "20%",
      y: "18%",
      children: [
        {
          id: "gpa.now",
          name: "现状",
          children: [
            { id: "gpa.now.score", name: "3.12 / 5.00", status: "done" },
          ],
        },
        {
          id: "gpa.later",
          name: "后面的课",
          children: [
            { id: "gpa.later.hold", name: "别再掉分", status: "active" },
          ],
        },
        {
          id: "gpa.doc",
          name: "成绩单",
          children: [
            { id: "gpa.doc.put", name: "放进申请", status: "todo" },
          ],
        },
      ],
    },
    {
      id: "language",
      name: "语言",
      fact: "韩语最高级 · 英语备考",
      side: "right",
      x: "80%",
      y: "32%",
      children: [
        {
          id: "language.ko",
          name: "韩语",
          children: [
            { id: "language.ko.top", name: "最高级", status: "done" },
            { id: "language.ko.proof", name: "证明收好", status: "done" },
          ],
        },
        {
          id: "language.en",
          name: "英语",
          children: [
            { id: "language.en.vocab", name: "词汇", status: "active" },
            { id: "language.en.listen", name: "听力阅读", status: "todo" },
            { id: "language.en.speak", name: "写作口语", status: "todo" },
            { id: "language.en.mock", name: "模考", status: "todo" },
            { id: "language.en.exam", name: "考雅思", status: "todo" },
          ],
        },
      ],
    },
    {
      id: "project",
      name: "项目",
      fact: "应用有完成 · 研究在做",
      side: "left",
      x: "17%",
      y: "50%",
      children: [
        {
          id: "project.app",
          name: "应用型",
          children: [
            { id: "project.app.done", name: "已完成的几个", status: "done" },
            { id: "project.app.active", name: "正在做的", status: "active" },
          ],
        },
        {
          id: "project.research",
          name: "研究型",
          children: [
            { id: "project.research.topic", name: "定题目", status: "active" },
            { id: "project.research.build", name: "做出来", status: "todo" },
            { id: "project.research.cv", name: "写进简历", status: "todo" },
          ],
        },
      ],
    },
    {
      id: "intern",
      name: "实习",
      fact: "企业已有 · 实验室待进",
      side: "right",
      x: "81%",
      y: "68%",
      children: [
        {
          id: "intern.company",
          name: "企业",
          children: [
            { id: "intern.company.one", name: "已有一段", status: "done" },
          ],
        },
        {
          id: "intern.lab",
          name: "实验室",
          children: [
            { id: "intern.lab.teacher", name: "找愿意带的老师", status: "active" },
            { id: "intern.lab.join", name: "进组做科研实习", status: "todo" },
            { id: "intern.lab.cv", name: "写进简历", status: "todo" },
          ],
        },
      ],
    },
    {
      id: "contest",
      name: "竞赛",
      fact: "先堆数量",
      side: "left",
      x: "20%",
      y: "82%",
      children: [
        {
          id: "contest.play",
          name: "参赛",
          children: [
            { id: "contest.play.join", name: "能报的就报", status: "active" },
            { id: "contest.play.log", name: "比完记下来", status: "todo" },
          ],
        },
        {
          id: "contest.cv",
          name: "履历",
          children: [
            { id: "contest.cv.proof", name: "证书收齐", status: "todo" },
            { id: "contest.cv.count", name: "按数量写上", status: "todo" },
          ],
        },
      ],
    },
  ],
};
