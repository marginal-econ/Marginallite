import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, type LegalSection } from "@/components/marketing/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — Marginalite" },
      {
        name: "description",
        content:
          "What Marginalite collects when you have a response marked, why, who can see it, how long it is kept, and how to get it deleted. Marginalite is independent of Cambridge Assessment International Education.",
      },
    ],
  }),
  component: PrivacyPage,
});

const SUMMARY = [
  "Marginalite is an independent AI study tool, not affiliated with or connected to Cambridge Assessment International Education, and its marking can be wrong.",
  "We collect what the marking needs: your account details, the work you submit, and how the tool was used.",
  "Your essays are processed to mark them. They are not sold, and not used to advertise to you.",
  "Your submitted work is private to your account, with high-scoring distinction responses (e.g. 6/6, 8/8) automatically featured in strictly anonymised format in the Exemplar Showcase for peer learning.",
  "Separate authorised teams hold limited, logged access rights for calibration and safety review.",
  "You can ask for your work and your account to be deleted, and we will do it.",
];

const SECTIONS: LegalSection[] = [
  {
    id: "who",
    title: "Who you are dealing with",
    body: (
      <>
        <p>
          Marginalite is an independent study tool for Cambridge IGCSE Economics (0455). It is not
          affiliated with, endorsed by, connected to, or in partnership with Cambridge Assessment
          International Education, Cambridge University Press &amp; Assessment, or the University of
          Cambridge, and no data you give us is shared with them.
        </p>
        <p>
          Marking runs on artificial intelligence, which means it can be wrong — marks, feedback and
          anything read off a photographed script included. The{" "}
          <Link to="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
            terms &amp; conditions
          </Link>{" "}
          set out what that means for how far you should rely on an output; this policy covers what
          happens to your data.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <ul>
          <li>
            <strong>Account details</strong> — your name and email address.
          </li>
          <li>
            <strong>The work you submit</strong> — essays, typed or pasted answers, photographs of
            handwritten scripts and the text lifted from them, diagrams, and the questions you
            attach them to.
          </li>
          <li>
            <strong>What the tool produced</strong> — marks, AO breakdowns, examiner notes and
            rewrite plans, kept so you can go back to them.
          </li>
          <li>
            <strong>Usage information</strong> — which features were used and when, plus basic
            technical logs needed to keep the service running and secure.
          </li>
        </ul>
        <p>
          We do not ask for anything we do not need, and there is no reason to put personal details
          about yourself or anyone else inside an essay.
        </p>
      </>
    ),
  },
  {
    id: "why",
    title: "Why we hold it",
    body: (
      <>
        <p>
          To mark your work and show you the result; to keep your history so progress is visible; to
          let separate authorised teams hold the marking standard steady; and to keep the service
          working, secure and free of misuse.
        </p>
        <p>We do not use your work to advertise to you, and we do not sell it to anyone.</p>
      </>
    ),
  },
  {
    id: "who-sees",
    title: "Who can see your work",
    body: (
      <>
        <p>
          <strong>You</strong>, always. Your private drafts, in-progress essays and practice
          attempts are only visible to you.
        </p>
        <p>
          <strong>Exemplar Showcase</strong>: Essays achieving distinction marks (8/8 for 8-mark,
          &gt;10 for 12-mark, or &gt;15 for 20-mark) are automatically made viewable in the Exemplar
          Showcase for peer revision and academic standards benchmarking. Author identities are
          strictly anonymised (only initials or Anonymous are shown). Only platform administrators
          have the authority to curate, add model responses, or hide/remove essays from the
          showcase.
        </p>
        <p>
          <strong>Your class teachers</strong>, while you are enrolled in their class, can view the
          learning activity needed to support you. This includes essay questions and marks, AO
          breakdowns, MCQ results and topic performance, and practice progress. Before joining
          a class, you must explicitly acknowledge this access. Leaving the class removes that
          teacher’s classroom access to your report.
        </p>
        <p>
          <strong>Separate authorised teams</strong> — the people who calibrate the marking standard
          and review it for quality and safety — hold special access rights granted by us for that
          purpose. Those rights are limited to what the work requires, are logged, and are withdrawn
          when the work ends. Students never hold them, and calibration reviewers see only what a
          review needs.
        </p>
        <p>
          <strong>We</strong> access individual work only where it is needed to fix a fault you have
          reported, to investigate misuse, or where the law requires it.
        </p>
      </>
    ),
  },
  {
    id: "processing",
    title: "AI processing",
    body: (
      <>
        <p>
          Marking runs through third-party AI model providers. Your essay text — and, for
          handwritten scripts, the image and the text extracted from it — is sent to those providers
          so it can be marked, along with the relevant extracts from Marginalite's approved knowledge
          base.
        </p>
        <p>
          We use providers on terms that do not permit your work to be used to train their models.
          The mark, the AO split and the notes come back to us and are stored with your essay. What
          comes back is generated by a model and can be inaccurate — treat it as a second opinion
          and check anything that matters.
        </p>
      </>
    ),
  },
  {
    id: "keeping",
    title: "How long it is kept",
    body: (
      <>
        <p>
          Work and marks are kept while your account is open, so your history stays useful across a
          two-year course. Delete an essay and it goes, along with its mark. Close your account and
          we delete the work associated with it, other than anything we must keep to meet a legal
          obligation, and backups which age out on their own schedule.
        </p>
        <p>
          Retired knowledge-base material and calibration exemplars are removed according to the
          platform's retention policy.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your choices",
    body: (
      <>
        <p>You can ask us to:</p>
        <ul>
          <li>show you what we hold about you;</li>
          <li>correct anything that is wrong;</li>
          <li>delete an essay, or your whole account;</li>
          <li>send you a copy of your work in a form you can keep.</li>
        </ul>
        <p>
          Requests should come directly from the email address on your account. We answer within a
          reasonable period, and we do not charge for it.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        Marginalite sets the cookies it needs to keep you signed in and to remember your theme. There
        are no advertising cookies and no third-party tracking pixels on this site.
      </p>
    ),
  },
  {
    id: "young-users",
    title: "Younger students",
    body: (
      <p>
        Marginalite is built for students taking a Cambridge IGCSE Economics (0455) course. Where a
        student is below the age at which they can consent for themselves, a parent or guardian must
        give that consent. If you believe a younger child has an account without that permission,
        contact us and we will remove it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <>
        <p>
          The date at the top of this page shows the current version. Material changes are announced
          on the site before they take effect.
        </p>
        <p>
          Questions, requests and complaints can be sent through our{" "}
          <Link to="/help" className="font-medium text-primary underline-offset-4 hover:underline">
            help and contact form
          </Link>
          . For account or privacy requests, use the email address connected to your account. The{" "}
          <Link to="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
            terms &amp; conditions
          </Link>{" "}
          cover everything else about using the service.
        </p>
      </>
    ),
  },
];

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      updated="5 September 2026"
      summary={SUMMARY}
      sections={SECTIONS}
    />
  );
}
