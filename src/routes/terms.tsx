import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, type LegalSection } from "@/components/marketing/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & conditions — Marginalite" },
      {
        name: "description",
        content:
          "The terms of use for Marginalite, the Cambridge IGCSE Economics (0455) response-marking tool: independence from Cambridge, access rights, academic honesty, the limits of an automated mark, and how your work is handled.",
      },
    ],
  }),
  component: TermsPage,
});

const SUMMARY = [
  "Marginalite is independent. It is not affiliated with, endorsed by, or connected to Cambridge Assessment International Education.",
  "Marginalite is an AI tool for Cambridge IGCSE Economics (0455). It can and does make mistakes, so every mark is a second opinion to be checked, never an official Cambridge mark.",
  "Calibration is restricted to authorised administrators holding special access rights granted by us.",
  "Your responses stay yours. High-scoring responses (e.g. 6/6, 8/8) are automatically featured in the Exemplar Showcase in strictly anonymised format for academic peer learning.",
  "Passing off a generated response as your own is a breach of these terms and of your school's academic honesty rules.",
];

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "What these terms cover",
    body: (
      <>
        <p>
          These terms are the agreement between you and Marginalite (“Marginalite”, “we”, “us”) covering
          your use of this website and the marking tools behind it. Using the site or creating an
          account means you accept them. If you are using Marginalite through your school, your
          school's own rules apply on top of these terms, and where a school rule is stricter, the
          school rule wins.
        </p>
        <p>
          Marginalite is an independent study tool built for Cambridge IGCSE Economics (0455). It is not
          affiliated with, endorsed by, connected to, approved by, or in partnership with Cambridge
          Assessment International Education, Cambridge University Press &amp; Assessment, or the
          University of Cambridge. The syllabus name and code are used only to describe the course
          this tool supports. Nothing produced here is an official Cambridge product, service, mark,
          or grade.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and eligibility",
    body: (
      <>
        <p>
          You need an account to submit work for marking. Keep your sign-in details to yourself:
          anything done through your account is treated as done by you, and sharing an account with
          another student makes the marking useless for both of you.
        </p>
        <p>
          Student accounts cannot upload official content, change roles, manage prompts, or alter
          the marking standard. Those capabilities are reserved for explicitly authorised
          administrators.
        </p>
        <p>
          If you are under the age at which you can agree to terms on your own where you live, you
          may use Marginalite only with the permission of a parent, guardian, or your school, and
          through an account your school has set up for you.
        </p>
      </>
    ),
  },
  {
    id: "access",
    title: "Access rights and calibration",
    body: (
      <>
        <p>
          Different parts of Marginalite are open to different people, and those levels are
          deliberately separate. A student account submits work and sees its own history. An
          administrator account manages approved material and the question bank. Student accounts
          cannot calibrate the marking.
        </p>
        <p>
          Calibration — setting and holding the standard the marking is measured against, and
          confirming the marks attached to anchor essays — is carried out only by separate
          authorised teams granted special access rights for that purpose. Those rights are issued
          and withdrawn by us, are limited to what the work requires, are logged, and are not
          available to students, however an account is set up.
        </p>
        <p>
          Trying to obtain, share, or use access rights you have not been granted is a breach of
          these terms and grounds for closing the account.
        </p>
      </>
    ),
  },
  {
    id: "not",
    title: "What the marks are, and what they are not",
    body: (
      <>
        <p>
          Every mark Marginalite produces is an <strong>estimate</strong>: a second opinion that shows
          its reasoning and cites the mark scheme it used, so you can check it and disagree with it.
          It is not an official Cambridge mark, it does not predict your grade, and it carries no
          weight in any qualification. Your teacher's mark is still the one that counts.
        </p>
        <p>
          We do not promise that a mark is correct, that two runs on the same essay will agree
          exactly, or that using Marginalite will improve your results. Marking is a judgement, and an
          automated judgement can be wrong in ways a person's would not be. Treat a mark you
          disagree with as a question worth taking to your teacher rather than as a verdict.
        </p>
      </>
    ),
  },
  {
    id: "mistakes",
    title: "Marginalite can make mistakes",
    body: (
      <>
        <p>
          Marginalite runs on artificial intelligence, and <strong>AI makes mistakes</strong>. A mark
          can come out too high or too low. A mark-scheme point can be missed, or credited when it
          was not earned. Feedback can misread what you wrote, misquote the syllabus, misread
          handwriting or a diagram, or state something wrong with complete confidence. The same
          essay marked twice may not produce the same mark.
        </p>
        <p>
          That is a limitation of the technology rather than a fault we expect to eliminate, so
          treat every output as a draft opinion to be checked, not as a fact. Check anything that
          matters against the syllabus, the mark scheme, and your teacher before relying on it. We
          do not warrant that the service is accurate, complete, current, or fit for any particular
          purpose, and we are not responsible for the consequences of relying on an output without
          checking it.
        </p>
      </>
    ),
  },
  {
    id: "honesty",
    title: "Academic honesty",
    body: (
      <>
        <p>
          The response generator exists so you can see what a full-mark answer looks like{" "}
          <em>after</em> you have written your own. Submitting a Marginalite-generated response — in whole
          or in part — as your own work for homework, coursework, a mock, or any assessed task is a
          breach of these terms, and almost certainly a breach of your school's academic honesty
          policy and of Cambridge's regulations.
        </p>
        <p>
          You are responsible for what you hand in. If your school asks us whether work submitted
          under a school account was generated, we may tell them.
        </p>
      </>
    ),
  },
  {
    id: "your-work",
    title: "Your work and the Exemplar Showcase",
    body: (
      <>
        <p>
          You keep every intellectual property right you already had in the essays, answers, notes
          and photographs of scripts you upload. You give us only the permission needed to run the
          service: to store your work, process it in order to mark it, and show it back to you.
        </p>
        <p>
          To foster collaborative academic excellence across the Cambridge 0455 community, student
          responses that attain top-band distinction marks (specifically 6/6 for 6-mark questions,
          or 8/8 for 8-mark questions) are automatically featured
          in the Exemplar Showcase. Showcased responses are strictly anonymised (displaying only author
          initials or anonymous markers) so that students can study master-level reasoning, AO
          breakdowns and examiner commentaries.
        </p>
        <p>
          Platform administrators retain full editorial moderation rights to curate, add official
          model exemplars, or remove responses from the showcase at any time. We do not sell your work,
          and we do not use your responses to advertise to third parties. How data is stored and how to
          request deletion are set out in the{" "}
          <Link
            to="/privacy"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            privacy policy
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "school-material",
    title: "Official material and the knowledge base",
    body: (
      <>
        <p>
          Marginalite marks against documents uploaded by authorised administrators — syllabus copies,
          coursebooks, past mark schemes and examiner reports. Anyone uploading material confirms
          they are entitled to use it this way and remains responsible for it.
        </p>
        <p>
          Uploaded material is used to ground marking and is not exposed to student accounts unless
          it has been explicitly published for learning use.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>Please don't:</p>
        <ul>
          <li>
            upload anyone else's work as if it were your own, or anyone else's personal information;
          </li>
          <li>upload material you have no right to share;</li>
          <li>
            try to break, scrape, overload, or reverse-engineer the service, or get at another
            user's work;
          </li>
          <li>
            use the service to produce material that is unlawful, abusive, or designed to deceive an
            examiner;
          </li>
          <li>resell access, or use it to build a competing marking service.</li>
        </ul>
        <p>
          We can suspend or close an account that does any of these, and we will tell the school
          where a school account is involved.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes",
    body: (
      <>
        <p>
          Marginalite is offered as it is. Features change, sometimes quickly, and the service may be
          unavailable for maintenance or for reasons outside our control. We do not guarantee
          uptime, and we would not rely on it the night before a deadline either.
        </p>
        <p>
          We may change, add, or withdraw features. Where a change materially reduces what an
          account can do, we will give notice through the site.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <>
        <p>
          To the extent the law allows, Marginalite is not liable for grades, results, academic
          consequences, lost work, or any indirect or consequential loss arising from your use of
          the service — including any loss arising from an inaccurate, incomplete, or missing mark
          or piece of feedback. Nothing here limits liability that cannot lawfully be limited.
        </p>
        <p>
          Because the marks are estimates, decisions that matter — what to revise, what to submit,
          what grade to predict — should rest with you and your teacher, not with the tool.
        </p>
      </>
    ),
  },
  {
    id: "ending",
    title: "Ending your use",
    body: (
      <>
        <p>
          You can stop using Marginalite at any time and ask for your account and its work to be
          deleted. We may suspend or close an account that breaches these terms, or where a school
          closes its own account.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of India, and the courts of India have jurisdiction
        over any dispute arising from them. If you are using Marginalite as a consumer somewhere else,
        this does not take away rights you have under the law of the country you live in.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We update these terms when the service changes. The date at the top of this page always
        shows the current version, and material changes are announced on the site before they take
        effect. Continuing to use Marginalite after that means you accept the updated terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <p>
          Questions about these terms, account deletion requests, partnership enquiries and reports
          of misuse can be sent directly through our{" "}
          <Link to="/help" className="font-medium text-primary underline-offset-4 hover:underline">
            help and contact form
          </Link>
          . You do not need to contact a school first.
        </p>
        <p>
          If something here is unclear, ask. A term you had to guess at is a term we wrote badly.
        </p>
      </>
    ),
  },
];

function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms & conditions"
      updated="5 September 2026"
      summary={SUMMARY}
      sections={SECTIONS}
    />
  );
}
