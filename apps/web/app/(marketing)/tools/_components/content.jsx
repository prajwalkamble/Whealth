import {
  EmergencyFundCalculator,
  FinancialRunwayCalculator,
  GoalFundingCalculator,
} from "./planning";
import { DebtPayoffCalculator, LoanPrepaymentCalculator } from "./debt";
import { InvestmentGrowthCalculator, SipGoalCalculator } from "./investing";
import {
  RetirementCorpusCalculator,
  RetirementWithdrawalCalculator,
} from "./retirement";
import {
  HomeAffordabilityCalculator,
  NetWorthCalculator,
  RentVsBuyCalculator,
} from "./position-housing";

// Each tool's calculator and its explanatory text, keyed by slug.
//
// Kept beside the components rather than in the registry: the registry is data
// the footer and directory read, and it should not have to carry JSX.

const P = ({ children }) => <p>{children}</p>;

export const CONTENT = {
  "retirement-withdrawal-planner": {
    Calculator: RetirementWithdrawalCalculator,
    howItWorks: (
      <>
        <P>
          Your savings are run forward one month at a time. Each month the
          balance earns a twelfth of the annual return and your withdrawal is
          taken out of it; each year the withdrawal rises with inflation,
          because the same life costs more than it did.
        </P>
        <P>
          The figure you can draw indefinitely is your return after inflation.
          Below it the pot keeps growing in real terms; above it, the pot is
          being spent down — however healthy the headline return looks.
        </P>
      </>
    ),
    assumptions: [
      "The return is earned steadily every month, which no real portfolio does.",
      "Your spending rises with inflation each year and never changes otherwise.",
      "Pension or other income is held flat, as most pensions and annuities are.",
      "No tax is deducted, and no large one-off cost arrives.",
      "Nothing is set aside for medical costs, which usually rise faster than general inflation.",
    ],
    considerations: [
      "Averages hide sequence risk: poor returns in the first few years of drawing down do far more damage than the same returns later, even if the average is identical.",
      "A result that says the money outlasts the horizon is not permission to draw more. It is sensitive to a return assumption you cannot control.",
      "Medical and care costs tend to arrive late and large. Many people hold a separate reserve for them rather than relying on the drawdown.",
    ],
  },

  "retirement-corpus-planner": {
    Calculator: RetirementCorpusCalculator,
    howItWorks: (
      <>
        <P>
          Your expenses today are inflated to what the same life would cost at
          the age you plan to retire. The target is then the present value of
          drawing that income, rising with inflation, for as many years as you
          want it to last — a growing annuity.
        </P>
        <P>
          That is deliberately not expenses multiplied by years. The pot keeps
          earning while you spend it, which reduces what you need, and the cost
          of the same lifestyle keeps rising, which increases it. Ignoring both
          gets the answer wrong in two directions at once.
        </P>
      </>
    ),
    assumptions: [
      "Returns are steady, and lower after retirement than before it.",
      "Inflation is constant, and your spending tracks it exactly.",
      "Contributions continue every month until you retire, without a break.",
      "No pension, state benefit, inheritance or property sale is counted.",
      "No tax is applied on the way in or the way out.",
    ],
    considerations: [
      "Small changes in the return and inflation assumptions move the target enormously over twenty or thirty years. Try it with pessimistic values for both.",
      "Retiring earlier raises the target twice over: a larger pot, funded across fewer working years.",
      "The target is a planning figure, not a finish line. Revisit it as your income, costs and plans change.",
    ],
  },

  "financial-runway-planner": {
    Calculator: FinancialRunwayCalculator,
    howItWorks: (
      <>
        <P>
          Your runway is simply your available savings divided by how fast you
          are spending them. The tool works out two rates: one for essentials
          alone, and one for your spending as it stands today.
        </P>
        <P>
          Any income that would keep arriving is subtracted first, because it
          slows the drain. If that income already covers a level of spending,
          there is no runway to report at that level — the tool says so rather
          than printing a very large number.
        </P>
      </>
    ),
    assumptions: [
      "Your spending stays at the level you entered, month after month.",
      "Your savings are available without penalty or delay, and earn nothing while you draw on them.",
      "Any income you entered continues for the whole period.",
      "No one-off costs arrive — and in a period without income, they often do.",
    ],
    considerations: [
      "The essential figure is the one that matters in a real shock, because discretionary spending is the first thing to go.",
      "Money in notice accounts, locked deposits or equities is not as liquid as cash; count only what you could reach quickly.",
      "A runway is a measure of time, not of safety. Two people with the same runway can be in very different positions.",
    ],
  },

  "emergency-fund-planner": {
    Calculator: EmergencyFundCalculator,
    howItWorks: (
      <>
        <P>
          The target is your essential monthly costs — including debt repayments,
          which do not pause — multiplied by the number of months you want
          covered. What you already hold is subtracted to give the gap.
        </P>
        <P>
          The same costs are also shown at three, six, nine and twelve months, so
          you can see what each horizon actually demands rather than picking one
          in the abstract.
        </P>
      </>
    ),
    assumptions: [
      "Your essential costs stay roughly as they are today.",
      "The reserve is held somewhere you can reach immediately.",
      "It is not invested in anything that could be down when you need it.",
    ],
    considerations: [
      "There is no single correct number. Someone with stable salaried income and a partner also earning needs less cover than a sole earner on variable income.",
      "How quickly you could find similar work matters more than any rule of thumb.",
      "A reserve that is too large has a cost too: money sitting in cash for years loses purchasing power.",
    ],
  },

  "goal-funding-planner": {
    Calculator: GoalFundingCalculator,
    howItWorks: (
      <>
        <P>
          The tool first works out what your existing savings would grow to on
          their own over the period. Whatever is still missing is the amount your
          contributions have to produce.
        </P>
        <P>
          That shortfall is then divided by the standard annuity factor — the
          amount a series of equal contributions compounds to — which gives the
          contribution each period. Contributions and growth are reported
          separately, because conflating them makes saving look more powerful
          than it is.
        </P>
      </>
    ),
    assumptions: [
      "The return you entered is earned steadily, every period, for the whole term.",
      "Contributions are made at the end of each period and never missed.",
      "No tax, fees or charges are deducted along the way.",
    ],
    considerations: [
      "Real returns are not steady. A sequence of poor early years leaves you behind even if the average works out.",
      "For a goal within three years or so, an assumed return is doing a lot of work. A cash plan with a 0% assumption is often the honest one.",
      "If the required contribution looks impossible, the useful levers are the amount, the date, or both — not a higher return assumption.",
    ],
  },

  "debt-payoff-planner": {
    Calculator: DebtPayoffCalculator,
    howItWorks: (
      <>
        <P>
          Every debt is simulated month by month. Interest is added to each
          balance, every minimum is paid, and whatever is left over — your extra
          payment, plus the minimums freed up by debts already cleared — goes
          against whichever debt the chosen order puts first.
        </P>
        <P>
          Both orders are run on the same figures so the difference between them
          can be shown. That difference is the thing worth looking at.
        </P>
      </>
    ),
    assumptions: [
      "Rates stay fixed and no new borrowing happens.",
      "You pay every minimum, plus the extra, every month without fail.",
      "Interest is charged monthly on the outstanding balance.",
      "No fees, penalties or promotional rates are modelled.",
    ],
    considerations: [
      "Neither order is universally right. Highest-rate-first costs less; smallest-balance-first clears a whole debt sooner, which many people find much easier to sustain.",
      "A plan you abandon in month four is worse than a slightly costlier plan you finish.",
      "Credit card minimums usually fall as the balance does. This tool holds them constant, which is the more conservative assumption.",
    ],
  },

  "loan-prepayment-planner": {
    Calculator: LoanPrepaymentCalculator,
    howItWorks: (
      <>
        <P>
          The loan is run to completion twice: once at your current instalment,
          and once with the extra monthly payment and any lump sum applied. Each
          month interest is charged on the outstanding balance and the rest of
          the payment reduces it.
        </P>
        <P>
          The difference between the two runs is the time and interest saved. A
          lump sum is applied before any further interest accrues, which is why
          it has an outsized effect early in a loan.
        </P>
      </>
    ),
    assumptions: [
      "The interest rate stays the same for the rest of the loan.",
      "Extra payments reduce the outstanding principal immediately and in full.",
      "Your instalment stays the same; the term shortens rather than the payment falling.",
      "No prepayment charge, processing fee or minimum prepayment amount applies.",
    ],
    considerations: [
      "Lenders differ. Some apply prepayments only on an instalment date, some charge a fee, and some reduce the instalment instead of the term — which saves far less interest.",
      "On a floating-rate loan, a future rate change will move both figures.",
      "Prepaying is not automatically the best use of money. Compare the interest saved against what the same amount might earn elsewhere, and against keeping a reserve.",
    ],
  },

  "investment-growth-planner": {
    Calculator: InvestmentGrowthCalculator,
    howItWorks: (
      <>
        <P>
          Two parts are compounded separately and added: your starting amount
          growing on its own, and your regular contributions growing as an
          ordinary annuity — each one compounding from the period it was made.
        </P>
        <P>
          The split between what you paid in and what it grew by is shown
          explicitly, year by year. If an inflation figure is given, the final
          value is also discounted back into today's money.
        </P>
      </>
    ),
    assumptions: [
      "The return is earned evenly every period, which no real investment does.",
      "Contributions are made at the end of each period and never missed.",
      "No tax, fund charges or transaction costs are deducted.",
      "Nothing is withdrawn along the way.",
    ],
    considerations: [
      "A steady return is a modelling convenience. Real markets deliver the same average through a very different path, and the path affects what you end up with.",
      "Small differences in assumed return compound into very large differences over decades. Treat the output as a range, not a figure.",
      "The today's-money figure is usually the more meaningful one for a long horizon.",
    ],
  },

  "sip-goal-planner": {
    Calculator: SipGoalCalculator,
    howItWorks: (
      <>
        <P>
          The same relationship, read in either direction. Given a target, the
          tool subtracts what your existing investment would itself grow to and
          solves for the monthly amount that covers the rest. Given a monthly
          amount, it projects forward instead.
        </P>
        <P>
          Both use monthly compounding at the annual rate you enter, divided by
          twelve.
        </P>
      </>
    ),
    assumptions: [
      "Every instalment is paid on time, for the full term.",
      "The assumed return is earned every month without variation.",
      "No exit load, expense ratio or tax is deducted.",
    ],
    considerations: [
      "A SIP buys at whatever the price is that month. That averaging is a real benefit, but it does not protect against a market that is lower when you need the money.",
      "Equity returns over short periods vary enormously. The longer the horizon, the more a long-run assumption is worth relying on.",
      "Past fund performance is not a forecast. Treat the return input as your assumption, not a fund's promise.",
    ],
  },

  "net-worth-calculator": {
    Calculator: NetWorthCalculator,
    howItWorks: (
      <>
        <P>
          Everything you own is added up, everything you owe is added up, and the
          second is subtracted from the first. The breakdowns show what each side
          is actually made of, as a share of the total.
        </P>
        <P>
          Nothing is stored. The figures exist only in this page while you have
          it open.
        </P>
      </>
    ),
    assumptions: [
      "The values you enter are current and realistic — particularly for property and vehicles, which are easy to overestimate.",
      "Liabilities are entered as outstanding balances, not as monthly payments.",
      "No allowance is made for tax, selling costs or early-exit penalties on anything you own.",
    ],
    considerations: [
      "Net worth is a snapshot, not a verdict. A negative figure is normal early in a mortgage or after studying.",
      "Composition matters as much as the total. A net worth that is almost entirely one illiquid property behaves very differently from the same figure in accessible savings.",
      "It says nothing about cash flow. People with substantial net worth can still be unable to cover a month's costs.",
    ],
  },

  "home-affordability-planner": {
    Calculator: HomeAffordabilityCalculator,
    howItWorks: (
      <>
        <P>
          The calculation runs backwards from cash flow rather than from a
          multiple of income. It takes the share of income you are willing to put
          towards debt, subtracts what you already commit each month and the
          recurring costs of the home, and treats what is left as the instalment
          you could carry.
        </P>
        <P>
          That instalment is then converted into the loan it would service over
          your chosen tenure, and the deposit is added to give a property price.
        </P>
      </>
    ),
    assumptions: [
      "Your income and existing commitments stay as they are.",
      "The interest rate holds for the whole tenure.",
      "The deposit is money you have, over and above an emergency reserve.",
      "The ceiling you chose is the one you actually want to live with.",
    ],
    considerations: [
      "This is not a lender's assessment and not an approval. Lenders apply their own rules, check credit history and employment, and value the property themselves.",
      "Buying costs — stamp duty, registration, legal fees, furnishing — are not in this figure and are substantial.",
      "Borrowing the maximum you can service leaves nothing for a rate rise, a repair or a gap in income.",
    ],
  },

  "rent-vs-buy-planner": {
    Calculator: RentVsBuyCalculator,
    howItWorks: (
      <>
        <P>
          Both paths are run over the same horizon and measured the same way:
          everything paid out, less what you still own at the end.
        </P>
        <P>
          Renting counts rent paid, rising each year, against a portfolio built
          from the deposit and buying costs you did not spend plus any month
          where the owner's outgoings exceed the rent. Buying counts interest,
          upkeep and purchase costs, against the equity you hold — the property's
          projected value less the loan still outstanding.
        </P>
      </>
    ),
    assumptions: [
      "Property appreciation and investment return are steady annual rates, which neither is.",
      "Rent rises by the same percentage every year.",
      "You stay for the whole horizon; selling earlier changes the answer substantially.",
      "No selling costs, capital gains tax, vacancy or major repair is modelled.",
    ],
    considerations: [
      "This comparison is extremely sensitive to two numbers you cannot know: how fast property appreciates and what your investments return. Try it with pessimistic values for each.",
      "It prices nothing about security of tenure, the freedom to move, or what a home is worth to you beyond money.",
      "The shorter your horizon, the more purchase costs dominate, and the harder buying is to justify on these figures alone.",
    ],
  },
};
