const nodemailer=require('nodemailer');

const token=process.env.FOOTBALL_API_TOKEN;
const senderEmail=process.env.SENDER_EMAIL;
const receiverEmail=process.env.RECEIVER_EMAIL;
const senderPassword=process.env.SENDER_PASSWORD;


const TARGET_LEAGUES=[
  39,  //English premier league
  140, // La Liga
  78,  //Bundesliga
  307, //Saudi Pro League
  253, //MSL
  135, //Serie A
  61, //Ligue 1
  2,  //UEFA Campions League
  3   //UEFA Europa League
];

const today=new Date().toISOString().split('T')[0];

async function fetchMatches() {
    const url = `https://v3.football.api-sports.io/fixtures?date=${today}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-apisports-key': token,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            }
        });

        const data = await response.json();
        
        if (!data.response || data.response.length === 0) {
            return '<p style="font-family: Arial; color: #666;">No matches scheduled globally for today.</p>';
        }

        // Filter fixtures to only include leagues matching our tracking array
        const leagueMatches = data.response.filter(item => TARGET_LEAGUES.includes(item.league.id));

        if (leagueMatches.length === 0) {
            return '<p style="font-family: Arial; color: #666;">No matches scheduled for today in your tracked leagues.</p>';
        }

        // Sort matches by league name for clean presentation
        leagueMatches.sort((a, b) => a.league.name.localeCompare(b.league.name));

        // Build the HTML content output
        let htmlTableContent = '';
        let currentLeagueId = null;

        leagueMatches.forEach(item => {
            // Add a clean section header whenever the league changes
            if (item.league.id !== currentLeagueId) {
                currentLeagueId = item.league.id;
                htmlTableContent += `
                    <tr>
                        <td colspan="5" style="padding: 15px 10px 5px 10px; font-family: Arial, sans-serif; font-size: 1.1em; color: #1e7e34; border-bottom: 2px solid #1e7e34; font-weight: bold; background-color: #f4fbf6;">
                            ⚽ ${item.league.name} (${item.league.country})
                        </td>
                    </tr>
                `;
            }

            const homeTeam = item.teams.home.name;
            const awayTeam = item.teams.away.name;
            const status = item.fixture.status.short; // Short code (FT, HT, NS, etc.)
            
            // Format match time from UTC to a clean hours/minutes notation
            const matchTime = new Date(item.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const homeScore = item.goals.home !== null ? item.goals.home : '-';
            const awayScore = item.goals.away !== null ? item.goals.away : '-';

            htmlTableContent += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: Arial, sans-serif; font-size: 0.95em; color: #555; width: 15%;">${matchTime}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: Arial, sans-serif; font-size: 0.95em; text-align: right; width: 30%;"><b>${homeTeam}</b></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: Arial, sans-serif; font-size: 0.95em; text-align: center; width: 15%; background-color: #fafafa; font-weight: bold; color: #333;">${homeScore} - ${awayScore}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: Arial, sans-serif; font-size: 0.95em; text-align: left; width: 30%;"><b>${awayTeam}</b></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: Arial, sans-serif; font-size: 0.85em; color: #777; width: 10%; text-align: center;">${status}</td>
                </tr>
            `;
        });

        return `
            <table style="width: 100%; border-collapse: collapse; max-width: 650px; margin: 0 auto; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background-color: #2e7d32; color: white; font-family: Arial, sans-serif; font-size: 0.95em;">
                        <th style="padding: 12px 10px; text-align: left;">Time</th>
                        <th style="padding: 12px 10px; text-align: right;">Home Team</th>
                        <th style="padding: 12px 10px; text-align: center;">Score</th>
                        <th style="padding: 12px 10px; text-align: left;">Away Team</th>
                        <th style="padding: 12px 10px; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${htmlTableContent}
                </tbody>
            </table>
        `;

    } catch (error) {
        console.error('Error fetching data from Football API:', error);
        throw error;
    }
}

async function sendEmail(htmlContent) {
    const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: senderEmail,
            pass: senderPassword 
        }
    });

    const mailOptions = {
        from: `"Matchday Intelligence" <${senderEmail}>`,
        to: receiverEmail,
        subject: `🏆 Tracked Football Matches - ${today}`,
        html: `
            <div style="background-color: #f8f9fa; padding: 20px; font-family: Arial, sans-serif;">
                <div style="max-width: 650px; margin: 0 auto; background: white; padding: 25px; border-radius: 8px; border-top: 5px solid #2e7d32;">
                    <h2 style="color: #333; margin-top: 0; font-family: Arial, sans-serif;">Your Daily Football Hub</h2>
                    <p style="color: #666; font-size: 1em;">Here is the agenda for your selected domestic and elite continental leagues today:</p>
                    <br>
                    ${htmlContent}
                    <br>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.8em; color: #aaa; text-align: center; margin: 0;">Automated pipeline run powered by GitHub Actions engine.</p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email dispatched successfully:', info.response);
    } catch (error) {
        console.error('Error sending email execution step:', error);
        throw error;
    }
}

async function main() {
    try {
        const htmlContent = await fetchMatches();
        await sendEmail(htmlContent);
    } catch (error) {
        console.error('Execution failure sequence logged:', error);
        process.exit(1);
    }
}

main();

