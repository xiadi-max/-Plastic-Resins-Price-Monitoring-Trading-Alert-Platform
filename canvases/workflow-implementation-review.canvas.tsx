import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  Link,
  Pill,
  Row,
  Spacer,
  Stack,
  Stat,
  Text,
  useHostTheme,
} from "cursor/canvas";

export default function WorkflowImplementationReviewCanvas() {
  const theme = useHostTheme();

  const phases = [
    {
      title: "Phase 1 — Fix correctness bugs",
      status: "优先级最高",
      items: [
        "修复上传图片蓝色框里的跳转链接与店铺数据不对应的问题，先排查链接字段映射、列表复用 key、缓存/索引错位与详情卡片的店铺绑定逻辑。",
        "增加店铺链接与展示卡片的强校验：每张卡片显示店铺名、店铺链接、来源 ID，避免后续再次错配。",
        "补充回归验证用例，覆盖新增店铺后刷新、切换店铺、重新上传图片三条路径。",
      ],
    },
    {
      title: "Phase 2 — 引入用户系统",
      status: "支撑能力",
      items: [
        "新增登录/会话体系，让‘添加店铺’、‘品类管理’、提醒配置等状态绑定到用户，而不是只停留在一次性的页面初始化。",
        "将店铺、品类、提醒规则、图片识别结果与用户 ID 关联，支持多端持久化与恢复。",
        "把首次进入页面的初始化改为‘基于用户加载’，减少每次打开页面都像新用户一样重新开始的问题。",
      ],
    },
    {
      title: "Phase 3 — 稳定性增强",
      status: "持续优化",
      items: [
        "梳理关键接口的错误处理、重试、超时与空状态兜底，减少偶发失败导致的业务中断。",
        "为店铺列表、品类管理和提醒列表增加 loading / stale / refresh 状态区分，避免长时间等待时用户误判。",
        "整理日志与埋点，定位数据错配、加载慢、刷新失败等问题的真实来源。",
      ],
    },
    {
      title: "Phase 4 — 自动定时刷新与提醒闭环",
      status: "计划中的核心能力",
      items: [
        "设计定时刷新任务：按用户、店铺、品类维度刷新抓价数据，并记录最近一次成功/失败时间。",
        "构建提醒闭环：发现变动 → 去重 → 生成提醒 → 用户确认/忽略 → 记录处理结果，形成完整状态流。",
        "增加可配置的刷新频率、静默时间段和提醒阈值，避免过度打扰。",
      ],
    },
  ];

  const risks = [
    "店铺链接错配通常是数据层而不是纯 UI 层问题，优先确认数据绑定链路。",
    "没有用户系统时，所有状态都容易依赖本地临时态，导致刷新、管理、提醒无法稳定闭环。",
    "定时刷新和提醒如果没有任务状态与幂等控制，容易出现重复通知和数据覆盖。",
  ];

  return (
    <Stack gap={20} style={{ padding: 24, background: theme.surface, minHeight: "100%" }}>
      <Row align="center" justify="space-between">
        <Stack gap={6}>
          <H1>工作流实现进度与下一步计划</H1>
          <Text tone="muted">
            结合当前进度与已发现问题，优先修复数据错配，再补用户系统，最后完善稳定性、自动刷新和提醒闭环。
          </Text>
        </Stack>
        <Pill tone="accent">当前阶段：梳理与增强</Pill>
      </Row>

      <Grid columns={4} gap={16}>
        <Stat label="当前关注点" value="4" caption="问题修复 + 架构补强" />
        <Stat label="优先级最高" value="链接错配" caption="先修数据映射与绑定" />
        <Stat label="中期关键" value="用户系统" caption="支持持久化与归属" />
        <Stat label="长期目标" value="闭环提醒" caption="刷新、去重、通知、处理" />
      </Grid>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader title="推荐推进顺序" subtitle="按风险与依赖关系排序" />
          <CardBody>
            <Stack gap={12}>
              {phases.map((phase, index) => (
                <Stack key={phase.title} gap={10}>
                  <Row align="center" justify="space-between">
                    <H2>{`${index + 1}. ${phase.title}`}</H2>
                    <Pill tone={index === 0 ? "danger" : index === 1 ? "warning" : "neutral"}>{phase.status}</Pill>
                  </Row>
                  <Stack gap={8}>
                    {phase.items.map((item) => (
                      <Text key={item}>• {item}</Text>
                    ))}
                  </Stack>
                  {index < phases.length - 1 ? <Divider /> : null}
                </Stack>
              ))}
            </Stack>
          </CardBody>
        </Card>

        <Stack gap={16}>
          <Card>
            <CardHeader title="你提到的两个问题" subtitle="先定位根因，再决定改造范围" />
            <CardBody>
              <Stack gap={10}>
                <Text>
                  1. 上传图片蓝框中的跳转链接和你添加的店铺不一致，建议优先检查“图片记录 → 店铺记录 → 链接展示”的关联关系，重点看是否存在复用旧数据、索引错位或缓存未刷新。
                </Text>
                <Text>
                  2. 目前没有用户登录系统，导致每次进入“添加店铺”都像新状态、每次进入“品类管理”都要重新加载。这通常说明缺少用户维度的会话、持久化与服务端归属。
                </Text>
                <Text>
                  这两个问题实际上指向同一件事：业务数据没有稳定绑定到“用户 + 店铺 + 任务”三层结构上。
                </Text>
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="主要风险点" subtitle="需要提前规避" />
            <CardBody>
              <Stack gap={8}>
                {risks.map((risk) => (
                  <Text key={risk}>• {risk}</Text>
                ))}
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      </Grid>

      <Card>
        <CardHeader title="建议的实施里程碑" subtitle="按两周到四周的节奏推进更稳妥" />
        <CardBody>
          <Grid columns={2} gap={20}>
            <Stack gap={8}>
              <Pill tone="danger">第 1 阶段</Pill>
              <Text>修复链接错配，补充展示字段与校验，确保添加店铺后图片卡片和店铺数据一一对应。</Text>
              <Text>完成后做一次回归，验证新增、编辑、刷新、切换页面都不会再串店铺。</Text>
            </Stack>
            <Stack gap={8}>
              <Pill tone="warning">第 2 阶段</Pill>
              <Text>上线用户登录与会话，重构“添加店铺 / 品类管理 / 提醒设置”的数据归属。</Text>
              <Text>让页面状态从一次性初始化变成用户级持久化，从根本上改善体验。</Text>
            </Stack>
            <Stack gap={8}>
              <Pill tone="neutral">第 3 阶段</Pill>
              <Text>增加自动定时刷新任务、任务状态跟踪与失败重试，保证数据稳定更新。</Text>
              <Text>同时完善提醒去重与处理闭环，减少重复通知。</Text>
            </Stack>
            <Stack gap={8}>
              <Pill tone="accent">第 4 阶段</Pill>
              <Text>补监控、日志与告警，形成可观察、可恢复、可追踪的长期运行机制。</Text>
              <Text>此时再优化性能和交互，收益会更高。</Text>
            </Stack>
          </Grid>
        </CardBody>
      </Card>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader title="可直接开工的任务拆分" subtitle="把计划落到页面、接口和数据层" />
          <CardBody>
            <Stack gap={12}>
              <Stack gap={6}>
                <H2>1. 数据绑定修复</H2>
                <Text>检查图片记录、店铺记录、展示卡片之间的关联字段，确认前端渲染时使用的是当前店铺，而不是缓存或旧索引。</Text>
                <Text>为关键数据补充唯一标识、来源 ID 和更新时间，减少错配排查成本。</Text>
              </Stack>
              <Divider />
              <Stack gap={6}>
                <H2>2. 用户系统接入</H2>
                <Text>落地登录态、会话保持和用户信息读取，把添加店铺、品类管理、提醒设置都改成用户级状态。</Text>
                <Text>同步调整接口入参，让服务端能够按用户隔离数据与权限。</Text>
              </Stack>
              <Divider />
              <Stack gap={6}>
                <H2>3. 自动化与提醒闭环</H2>
                <Text>定义定时刷新任务模型，记录任务状态、最近执行时间和失败原因。</Text>
                <Text>补齐提醒生成、去重、确认、忽略和归档流程，避免重复通知和状态丢失。</Text>
              </Stack>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="实施依赖关系" subtitle="先解决基础归属，再做自动化" />
          <CardBody>
            <Stack gap={10}>
              <Row align="center" justify="space-between">
                <Text>数据正确性</Text>
                <Pill tone="danger">先做</Pill>
              </Row>
              <Text tone="muted">错配不修，后续所有自动化都会放大问题。</Text>
              <Divider />
              <Row align="center" justify="space-between">
                <Text>用户系统</Text>
                <Pill tone="warning">其次</Pill>
              </Row>
              <Text tone="muted">没有用户归属，就无法稳定保存店铺、品类和提醒配置。</Text>
              <Divider />
              <Row align="center" justify="space-between">
                <Text>定时任务与提醒</Text>
                <Pill tone="neutral">之后</Pill>
              </Row>
              <Text tone="muted">必须依赖正确的数据模型和用户态，才能避免重复、漏发和覆盖。</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Row justify="space-between" align="center">
        <Text tone="muted">Source: 当前项目进度说明 + 你反馈的两个问题 · Time range: 现阶段需求评审</Text>
        <Row gap={8}>
          <Link href="/Users/86133/.cursor/projects/e-vibecoding-1/canvases/workflow-implementation-review.canvas.tsx">打开画布文件</Link>
          <Button variant="secondary">后续可继续细化到任务拆分</Button>
        </Row>
      </Row>
      <Spacer size={4} />
    </Stack>
  );
}
