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
  253, //MLS
  135, //Serie A
  61,  //Ligue 1
  2,   //UEFA Champions League
  3    //UEFA Europa League
];

const STATUS_MAP = {
  NS:   'Not Started',
  '1H': 'First Half',
  HT:   'Half Time',
  '2H': 'Second Half',
  ET:   'Extra Time',
  PEN:  'Penalties',
  FT:   'Full Time',
  AET:  'After Extra Time',
  ABD:  'Abandoned',
  PST:  'Postponed',
  CANC: 'Cancelled'
};

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

        const leagueMatches = data.response.filter(item => TARGET_LEAGUES.includes(item.league.id));

        if (leagueMatches.length === 0) {
            return '<p style="font-family: Arial; color: #666;">No matches scheduled for today in your tracked leagues.</p>';
        }

        leagueMatches.sort((a, b) => a.league.name.localeCompare(b.league.name));

        let htmlCards = '';
        let currentLeagueId = null;

        leagueMatches.forEach(item => {
            if (item.league.id !== currentLeagueId) {
                currentLeagueId = item.league.id;
                htmlCards += `
                    <div style="margin: 20px 0 8px 0; padding: 10px 14px; background-color: #f4fbf6; border-left: 4px solid #2e7d32; border-radius: 4px; display: flex; align-items: center; gap: 10px;">
                        <img src="${item.league.logo}" alt="" style="width: 24px; height: 24px; object-fit: contain; vertical-align: middle;">
                        <span style="font-family: Arial, sans-serif; font-size: 1em; font-weight: bold; color: #1e7e34; vertical-align: middle;">
                            ${item.league.name}
                        </span>
                        <span style="font-family: Arial, sans-serif; font-size: 0.8em; color: #888; margin-left: auto; vertical-align: middle;">
                            ${item.league.round || ''}
                        </span>
                    </div>
                `;
            }

            const homeTeam = item.teams.home.name;
            const awayTeam = item.teams.away.name;
            const homeLogo = item.teams.home.logo;
            const awayLogo = item.teams.away.logo;
            const statusCode = item.fixture.status.short;
            const statusFull = STATUS_MAP[statusCode] || statusCode;
            const matchTime = new Date(item.fixture.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
            const homeScore = item.goals.home !== null ? item.goals.home : '-';
            const awayScore = item.goals.away !== null ? item.goals.away : '-';
            const venue = item.fixture.venue.name ? `🏟️ ${item.fixture.venue.name}` : '';
            const referee = item.fixture.referee ? `👤 ${item.fixture.referee}` : '';

            // Status color
            let statusColor = '#888';
            if (['1H','2H','ET','PEN'].includes(statusCode)) statusColor = '#e65100'; // live = orange
            if (statusCode === 'FT' || statusCode === 'AET') statusColor = '#2e7d32'; // finished = green
            if (['PST','CANC','ABD'].includes(statusCode)) statusColor = '#c62828'; // cancelled = red

            htmlCards += `
                <div style="background: #ffffff; border: 1px solid #e8e8e8; border-radius: 8px; margin-bottom: 8px; overflow: hidden;">
                    
                    <!-- Match row -->
                    <div style="padding: 12px 14px;">
                        
                        <!-- Time + Status row -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="font-family: Arial, sans-serif; font-size: 0.85em; color: #555; font-weight: bold;">${matchTime} IST</span>
                            <span style="font-family: Arial, sans-serif; font-size: 0.78em; color: ${statusColor}; font-weight: bold; background: ${statusColor}18; padding: 2px 8px; border-radius: 10px;">${statusFull}</span>
                        </div>

                        <!-- Teams + Score row -->
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            
                            <!-- Home team -->
                            <div style="flex: 1; text-align: center;">
                                <img src="${homeLogo}" alt="${homeTeam}" style="width: 36px; height: 36px; object-fit: contain; display: block; margin: 0 auto 4px auto;">
                                <span style="font-family: Arial, sans-serif; font-size: 0.82em; color: #222; font-weight: bold; display: block; line-height: 1.2;">${homeTeam}</span>
                            </div>

                            <!-- Score -->
                            <div style="text-align: center; min-width: 60px;">
                                <span style="font-family: Arial, sans-serif; font-size: 1.3em; font-weight: bold; color: #333;">${homeScore} - ${awayScore}</span>
                            </div>

                            <!-- Away team -->
                            <div style="flex: 1; text-align: center;">
                                <img src="${awayLogo}" alt="${awayTeam}" style="width: 36px; height: 36px; object-fit: contain; display: block; margin: 0 auto 4px auto;">
                                <span style="font-family: Arial, sans-serif; font-size: 0.82em; color: #222; font-weight: bold; display: block; line-height: 1.2;">${awayTeam}</span>
                            </div>

                        </div>
                    </div>

                    <!-- Venue + Referee footer -->
                    ${venue || referee ? `
                    <div style="padding: 6px 14px; background: #fafafa; border-top: 1px solid #f0f0f0;">
                        <span style="font-family: Arial, sans-serif; font-size: 0.75em; color: #aaa;">
                            ${venue}${venue && referee ? '&nbsp;&nbsp;|&nbsp;&nbsp;' : ''}${referee}
                        </span>
                    </div>` : ''}

                </div>
            `;
        });

        return htmlCards;

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
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { margin: 0; padding: 0; background-color: #f8f9fa; }
                    .wrapper { max-width: 600px; margin: 0 auto; padding: 16px; }
                    .header { background: #2e7d32; border-radius: 8px 8px 0 0; padding: 20px; }
                    .body { background: white; padding: 16px; border-radius: 0 0 8px 8px; }
                    .footer { text-align: center; padding: 16px; font-family: Arial, sans-serif; font-size: 0.75em; color: #aaa; }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="header">
                        <h2 style="color: white; margin: 0; font-family: Arial, sans-serif; font-size: 1.2em;">⚽ Your Daily Football Hub</h2>
                        <p style="color: #a5d6a7; margin: 6px 0 0 0; font-family: Arial, sans-serif; font-size: 0.85em;">Fixtures for ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
                    </div>
                    <div class="body">
                        ${htmlContent}
                    </div>
                    <div class="footer">
                        Automated pipeline run powered by GitHub Actions
                    </div>
                </div>
            </body>
            </html>
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
