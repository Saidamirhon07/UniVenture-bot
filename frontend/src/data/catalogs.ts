export type Opportunity = {
  title: string;
  type: string;
  area: "STEM" | "Research" | "Business" | "Writing" | "Global" | "Service";
  access: string;
  fit: string;
  signal: string;
  url: string;
};

export const opportunities: Opportunity[] = [
  { title: "Yale Young Global Scholars", type: "Summer", area: "Global", access: "International · aid available", fit: "Interdisciplinary seminars and a global cohort", signal: "Curiosity + discussion", url: "https://globalscholars.yale.edu/" },
  { title: "Rise", type: "Fellowship", area: "Service", access: "Global · check current cycle", fit: "For young people building ideas in service of others", signal: "Purpose + resilience", url: "https://www.risefortheworld.org/" },
  { title: "Pioneer Academics", type: "Research", area: "Research", access: "International · aid options", fit: "Faculty-guided research for advanced secondary students", signal: "Research depth", url: "https://pioneeracademics.com/" },
  { title: "LaunchX", type: "Entrepreneurship", area: "Business", access: "International", fit: "Build and test a venture with a student team", signal: "Execution + teamwork", url: "https://www.launchx.com/" },
  { title: "Immerse Essay Competition", type: "Competition", area: "Writing", access: "International", fit: "Academic writing through subject-specific prompts", signal: "Argument + clarity", url: "https://www.immerse.education/essay-competition/" },
  { title: "Conrad Challenge", type: "Innovation", area: "STEM", access: "Global teams", fit: "Turn a real problem into an innovation pitch", signal: "Innovation + proof", url: "https://www.conradchallenge.org/" },
  { title: "Breakthrough Junior Challenge", type: "Video challenge", area: "STEM", access: "Global ages 13–18", fit: "Explain a difficult science or math idea through video", signal: "Mastery + communication", url: "https://breakthroughjuniorchallenge.org/" },
  { title: "Diamond Challenge", type: "Venture challenge", area: "Business", access: "Global high-school teams", fit: "Develop a business or social venture concept", signal: "Problem solving + pitch", url: "https://diamondchallenge.org/" },
  { title: "Technovation Girls", type: "Technology", area: "STEM", access: "Global · girls and young women", fit: "Build a technology solution to a community problem", signal: "Product + impact", url: "https://technovationchallenge.org/" },
  { title: "NASA Space Apps Challenge", type: "Hackathon", area: "STEM", access: "Global local events", fit: "Use open data to solve Earth and space challenges", signal: "Collaboration + prototype", url: "https://www.spaceappschallenge.org/" },
  { title: "Regeneron ISEF Pathway", type: "Science fair", area: "Research", access: "Through affiliated fairs", fit: "Advance original research through a recognized local fair", signal: "Method + evidence", url: "https://www.societyforscience.org/isef/" },
  { title: "International Research Olympiad", type: "Research challenge", area: "Research", access: "International · verify eligibility", fit: "Practice research reasoning and interpretation", signal: "Analysis + method", url: "https://www.internationalresearcholympiad.com/" },
  { title: "iGEM Competition", type: "Synthetic biology", area: "STEM", access: "Global teams", fit: "Build a responsible biology project with a team", signal: "Research + collaboration", url: "https://competition.igem.org/" },
  { title: "FIRST Robotics Competition", type: "Robotics", area: "STEM", access: "Team-based · regional access", fit: "Engineer, fund and present a competition robot", signal: "Engineering + leadership", url: "https://www.firstinspires.org/robotics/frc" },
  { title: "World Robot Olympiad", type: "Robotics", area: "STEM", access: "National selection routes", fit: "Design robotic solutions around an annual challenge", signal: "Build + iteration", url: "https://wro-association.org/" },
  { title: "Imagine Cup Junior", type: "AI challenge", area: "STEM", access: "Global secondary students", fit: "Develop an AI concept for a real-world issue", signal: "AI literacy + solution", url: "https://imaginecup.microsoft.com/en-us/junior" },
  { title: "Bebras Challenge", type: "Computational thinking", area: "STEM", access: "Country organizers", fit: "Build algorithmic reasoning without advanced coding", signal: "Logic + consistency", url: "https://www.bebras.org/" },
  { title: "International Olympiad in Informatics Pathway", type: "Olympiad", area: "STEM", access: "National team selection", fit: "Train competitive programming through the national pathway", signal: "Technical mastery", url: "https://ioinformatics.org/" },
  { title: "International Mathematical Olympiad Pathway", type: "Olympiad", area: "STEM", access: "National team selection", fit: "Pursue proof-based mathematics through national rounds", signal: "Depth + persistence", url: "https://www.imo-official.org/" },
  { title: "International Physics Olympiad Pathway", type: "Olympiad", area: "STEM", access: "National team selection", fit: "Develop advanced problem solving and experimental physics", signal: "Rigor + mastery", url: "https://www.ipho-new.org/" },
  { title: "John Locke Essay Competition", type: "Essay", area: "Writing", access: "International", fit: "Build a reasoned argument in humanities or social science", signal: "Independent thought", url: "https://www.johnlockeinstitute.com/essay-competition" },
  { title: "Queen’s Commonwealth Essay Competition", type: "Essay", area: "Writing", access: "Commonwealth eligibility", fit: "Write on a civic and global theme", signal: "Voice + perspective", url: "https://www.royalcwsociety.org/the-qcec" },
  { title: "New York Times Student Contests", type: "Writing", area: "Writing", access: "Check each contest", fit: "Publish concise arguments, reviews and personal narratives", signal: "Audience + craft", url: "https://www.nytimes.com/spotlight/learning-contests" },
  { title: "Bow Seat Ocean Awareness Contest", type: "Creative challenge", area: "Writing", access: "Global secondary students", fit: "Connect environmental issues with writing or visual work", signal: "Creativity + advocacy", url: "https://bowseat.org/programs/ocean-awareness-contest/" },
  { title: "Goi Peace Foundation Essay Contest", type: "Essay", area: "Writing", access: "International youth", fit: "Reflect on peace, responsibility and social change", signal: "Values + reflection", url: "https://www.goipeace.or.jp/en/work/essay-contest/" },
  { title: "Blue Ocean Student Entrepreneur Competition", type: "Entrepreneurship", area: "Business", access: "Global secondary students", fit: "Pitch a differentiated solution using market strategy", signal: "Strategy + storytelling", url: "https://blueoceancompetition.org/" },
  { title: "Wharton Global High School Investment Competition", type: "Finance", area: "Business", access: "Global school teams", fit: "Build and defend a long-term investment strategy", signal: "Analysis + teamwork", url: "https://globalyouth.wharton.upenn.edu/investment-competition/" },
  { title: "Global Youth Entrepreneurship Challenge", type: "Entrepreneurship", area: "Business", access: "International teams", fit: "Solve a time-bound business challenge collaboratively", signal: "Decision making", url: "https://gyec.org/" },
  { title: "GENIUS Olympiad", type: "Sustainability", area: "STEM", access: "International projects", fit: "Present science, business, writing or art for environmental impact", signal: "Project + sustainability", url: "https://geniusolympiad.org/" },
  { title: "The Earth Prize", type: "Sustainability", area: "Service", access: "Global students", fit: "Develop an environmental solution with measurable potential", signal: "Impact + feasibility", url: "https://www.theearthprize.org/" },
  { title: "AFS Global STEM Academies", type: "Scholarship program", area: "Global", access: "Selected countries · verify cycle", fit: "Combine STEM, sustainability and intercultural learning", signal: "Global mindset", url: "https://afs.org/global-stem/academies/" },
  { title: "UWC National Committee Selection", type: "Scholarship pathway", area: "Global", access: "Uzbekistan national route", fit: "Apply for an international residential education and aid", signal: "Community + initiative", url: "https://www.uz.uwc.org/" },
  { title: "FLEX Program", type: "Exchange", area: "Global", access: "Eligible countries and ages", fit: "Spend an academic year in the US through merit selection", signal: "Adaptability + leadership", url: "https://www.discoverflex.org/" },
  { title: "EducationUSA Opportunity Funds", type: "Access support", area: "Global", access: "Country office selection", fit: "Support application costs for high-achieving students with financial need", signal: "Readiness + access", url: "https://educationusa.state.gov/your-5-steps-us-study/finance-your-studies/opportunity-funds-program" },
  { title: "TechGirls", type: "Exchange", area: "STEM", access: "Eligible countries · girls", fit: "Technology, leadership and community project development", signal: "STEM + service", url: "https://techgirlsglobal.org/" },
  { title: "International Youth Math Challenge", type: "Math challenge", area: "STEM", access: "International online", fit: "Practice multi-stage mathematical problem solving", signal: "Reasoning + discipline", url: "https://www.iymc.info/" },
];

export type UniversityProfile = {
  name: string;
  country: string;
  city: string;
  strengths: string[];
  environment: string;
  selectivity: number;
  satReference: number;
  aid: "strong" | "varies" | "limited";
  officialUrl: string;
};

export const universities: UniversityProfile[] = [
  { name: "MIT", country: "United States", city: "Cambridge, MA", strengths: ["Engineering", "Computer Science", "Science"], environment: "Urban, research-intensive", selectivity: 5, satReference: 1540, aid: "strong", officialUrl: "https://mitadmissions.org/" },
  { name: "Stanford University", country: "United States", city: "Stanford, CA", strengths: ["Computer Science", "Engineering", "Entrepreneurship"], environment: "Suburban, innovation-driven", selectivity: 5, satReference: 1540, aid: "strong", officialUrl: "https://admission.stanford.edu/" },
  { name: "Harvard University", country: "United States", city: "Cambridge, MA", strengths: ["Economics", "Government", "Life Sciences"], environment: "Urban, broad liberal arts", selectivity: 5, satReference: 1540, aid: "strong", officialUrl: "https://college.harvard.edu/admissions" },
  { name: "Yale University", country: "United States", city: "New Haven, CT", strengths: ["Humanities", "Politics", "Arts"], environment: "Urban, residential colleges", selectivity: 5, satReference: 1530, aid: "strong", officialUrl: "https://admissions.yale.edu/" },
  { name: "Princeton University", country: "United States", city: "Princeton, NJ", strengths: ["Mathematics", "Public Policy", "Engineering"], environment: "College town, undergraduate focus", selectivity: 5, satReference: 1540, aid: "strong", officialUrl: "https://admission.princeton.edu/" },
  { name: "University of Pennsylvania", country: "United States", city: "Philadelphia, PA", strengths: ["Business", "Economics", "Nursing"], environment: "Urban, interdisciplinary", selectivity: 4.9, satReference: 1520, aid: "strong", officialUrl: "https://admissions.upenn.edu/" },
  { name: "Cornell University", country: "United States", city: "Ithaca, NY", strengths: ["Engineering", "Agriculture", "Hospitality"], environment: "College town, large private", selectivity: 4.6, satReference: 1500, aid: "varies", officialUrl: "https://admissions.cornell.edu/" },
  { name: "Duke University", country: "United States", city: "Durham, NC", strengths: ["Biomedical Engineering", "Economics", "Public Policy"], environment: "Suburban, collaborative", selectivity: 4.8, satReference: 1520, aid: "strong", officialUrl: "https://admissions.duke.edu/" },
  { name: "Northwestern University", country: "United States", city: "Evanston, IL", strengths: ["Journalism", "Engineering", "Economics"], environment: "Suburban near major city", selectivity: 4.7, satReference: 1510, aid: "varies", officialUrl: "https://admissions.northwestern.edu/" },
  { name: "University of Chicago", country: "United States", city: "Chicago, IL", strengths: ["Economics", "Mathematics", "Social Sciences"], environment: "Urban, theory-intensive", selectivity: 4.8, satReference: 1530, aid: "strong", officialUrl: "https://collegeadmissions.uchicago.edu/" },
  { name: "New York University", country: "United States", city: "New York, NY", strengths: ["Business", "Arts", "Computer Science"], environment: "Highly urban", selectivity: 4.4, satReference: 1500, aid: "limited", officialUrl: "https://www.nyu.edu/admissions/undergraduate-admissions.html" },
  { name: "University of Rochester", country: "United States", city: "Rochester, NY", strengths: ["Optics", "Music", "Data Science"], environment: "Suburban, flexible curriculum", selectivity: 3.7, satReference: 1450, aid: "varies", officialUrl: "https://admissions.rochester.edu/" },
  { name: "Macalester College", country: "United States", city: "Saint Paul, MN", strengths: ["International Studies", "Economics", "Data Science"], environment: "Small urban liberal arts", selectivity: 3.5, satReference: 1430, aid: "strong", officialUrl: "https://www.macalester.edu/admissions/" },
  { name: "Illinois Institute of Technology", country: "United States", city: "Chicago, IL", strengths: ["Engineering", "Architecture", "Computer Science"], environment: "Urban, technology-focused", selectivity: 2.8, satReference: 1320, aid: "varies", officialUrl: "https://www.iit.edu/admissions-aid/undergraduate-admission" },
  { name: "Arizona State University", country: "United States", city: "Tempe, AZ", strengths: ["Engineering", "Business", "Sustainability"], environment: "Large urban public", selectivity: 2.2, satReference: 1240, aid: "varies", officialUrl: "https://admission.asu.edu/" },
  { name: "University of Oxford", country: "United Kingdom", city: "Oxford", strengths: ["Humanities", "Sciences", "PPE"], environment: "Collegiate, tutorial-based", selectivity: 4.9, satReference: 1500, aid: "limited", officialUrl: "https://www.ox.ac.uk/admissions/undergraduate" },
  { name: "University of Cambridge", country: "United Kingdom", city: "Cambridge", strengths: ["Engineering", "Natural Sciences", "Mathematics"], environment: "Collegiate, supervision-based", selectivity: 4.9, satReference: 1500, aid: "limited", officialUrl: "https://www.undergraduate.study.cam.ac.uk/" },
  { name: "Imperial College London", country: "United Kingdom", city: "London", strengths: ["Engineering", "Computing", "Medicine"], environment: "Urban, STEM-intensive", selectivity: 4.6, satReference: 1480, aid: "limited", officialUrl: "https://www.imperial.ac.uk/study/apply/undergraduate/" },
  { name: "University College London", country: "United Kingdom", city: "London", strengths: ["Architecture", "Engineering", "Social Sciences"], environment: "Urban, multidisciplinary", selectivity: 4.3, satReference: 1450, aid: "limited", officialUrl: "https://www.ucl.ac.uk/prospective-students/undergraduate" },
  { name: "London School of Economics", country: "United Kingdom", city: "London", strengths: ["Economics", "Politics", "Finance"], environment: "Urban, social-science focused", selectivity: 4.7, satReference: 1490, aid: "limited", officialUrl: "https://www.lse.ac.uk/study-at-lse/Undergraduate" },
  { name: "University of Edinburgh", country: "United Kingdom", city: "Edinburgh", strengths: ["Informatics", "Medicine", "Humanities"], environment: "Urban, historic, large", selectivity: 3.9, satReference: 1420, aid: "limited", officialUrl: "https://www.ed.ac.uk/studying/undergraduate" },
  { name: "University of Toronto", country: "Canada", city: "Toronto", strengths: ["Computer Science", "Engineering", "Life Sciences"], environment: "Large urban research", selectivity: 4.0, satReference: 1450, aid: "limited", officialUrl: "https://future.utoronto.ca/" },
  { name: "University of British Columbia", country: "Canada", city: "Vancouver", strengths: ["Science", "Business", "Environmental Studies"], environment: "Large coastal campus", selectivity: 3.8, satReference: 1420, aid: "varies", officialUrl: "https://you.ubc.ca/" },
  { name: "Bocconi University", country: "Italy", city: "Milan", strengths: ["Economics", "Business", "Data Science"], environment: "Urban, international", selectivity: 4.0, satReference: 1420, aid: "varies", officialUrl: "https://www.unibocconi.it/en/programs/bachelor-science" },
  { name: "National University of Singapore", country: "Singapore", city: "Singapore", strengths: ["Engineering", "Computing", "Business"], environment: "Urban, research-intensive", selectivity: 4.8, satReference: 1500, aid: "varies", officialUrl: "https://nus.edu.sg/oam/admissions" },
  { name: "University of Hong Kong", country: "Hong Kong", city: "Hong Kong", strengths: ["Business", "Medicine", "Engineering"], environment: "Urban, international", selectivity: 4.2, satReference: 1450, aid: "varies", officialUrl: "https://admissions.hku.hk/" },
  { name: "KAIST", country: "South Korea", city: "Daejeon", strengths: ["Engineering", "Computer Science", "Science"], environment: "Research campus, STEM-focused", selectivity: 4.5, satReference: 1480, aid: "strong", officialUrl: "https://admission.kaist.ac.kr/intl-undergraduate/" },
  { name: "NYU Abu Dhabi", country: "United Arab Emirates", city: "Abu Dhabi", strengths: ["Liberal Arts", "Computer Science", "Economics"], environment: "Residential, globally diverse", selectivity: 4.9, satReference: 1510, aid: "strong", officialUrl: "https://nyuad.nyu.edu/en/admissions/undergraduate.html" },
  { name: "Nazarbayev University", country: "Kazakhstan", city: "Astana", strengths: ["Engineering", "Science", "Public Policy"], environment: "Modern residential research", selectivity: 3.4, satReference: 1350, aid: "strong", officialUrl: "https://nu.edu.kz/admissions" },
  { name: "New Uzbekistan University", country: "Uzbekistan", city: "Tashkent", strengths: ["Engineering", "Computer Science", "Mathematics"], environment: "New technology-focused campus", selectivity: 3.0, satReference: 1300, aid: "varies", officialUrl: "https://newuu.uz/en/admissions" },
];
