async function startHunt() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const query = document.getElementById('searchQuery').value.trim();
    const maxSubs = parseInt(document.getElementById('maxSubs').value) || 5000;
    const statusBox = document.getElementById('status');
    const tableBody = document.getElementById('tableBody');
    const tableContainer = document.getElementById('tableContainer');
    const huntBtn = document.getElementById('huntBtn');

    // Purana data clear karna
    tableBody.innerHTML = "";
    tableContainer.style.display = "none";

    // Validation
    if (!apiKey || !query) {
        statusBox.innerHTML = "<p style='color:#ff4444;'>⚠️ Bhai, API Key aur Topic daalna zaroori hai!</p>";
        return;
    }

    // Button disable karna jab API chal rahi ho
    huntBtn.disabled = true;
    huntBtn.style.opacity = "0.6";
    huntBtn.innerText = "Hunting... ⏳";

    statusBox.innerHTML = "<p style='color:#fff;'>🔍 1/2: Searching latest YouTube videos... ⏳</p>";
    
    // 24 ghante purana time nikalna
    let yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    let publishedAfter = yesterday.toISOString();

    // YouTube Search API (Top 50 videos)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=50&order=viewCount&publishedAfter=${publishedAfter}&q=${encodeURIComponent(query)}&key=${apiKey}`;

    try {
        let searchResponse = await fetch(searchUrl);
        let searchData = await searchResponse.json();

        if (searchData.error) {
            throw new Error(searchData.error.message);
        }

        let videos = searchData.items;
        if (!videos || videos.length === 0) {
            statusBox.innerHTML = "<p style='color:#ffbb33;'>⚠️ Is topic par pichle 24 ghante mein koi video nahi mili.</p>";
            resetButton();
            return;
        }

        statusBox.innerHTML = "<p style='color:#fff;'>⚙️ 2/2: Checking subscriber counts for " + videos.length + " channels... ⏳</p>";
        
        // Saare Channel IDs ko ek comma separated string banayein
        let channelIds = videos.map(v => v.snippet.channelId).join(',');

        // YouTube Channels API (Subs check karne ke liye)
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelIds}&key=${apiKey}`;
        let channelResponse = await fetch(channelUrl);
        let channelData = await channelResponse.json();

        if (channelData.error) {
            throw new Error(channelData.error.message);
        }

        // Channel ID -> Subscribers ka map
        let channelStats = {};
        channelData.items.forEach(channel => {
            channelStats[channel.id] = parseInt(channel.statistics.subscriberCount) || 0;
        });

        // Data filter aur render karna
        let foundOutliers = false;
        for (let video of videos) {
            let chId = video.snippet.channelId;
            let subs = channelStats[chId];

            if (subs <= maxSubs) {
                foundOutliers = true;
                let thumbUrl = video.snippet.thumbnails.medium.url;
                let videoId = video.id.videoId;
                let videoLink = `https://www.youtube.com/watch?v=${videoId}`;
                let title = video.snippet.title;
                let channelName = video.snippet.channelTitle;

                let row = `<tr>
                    <td><img src="${thumbUrl}" alt="Thumbnail"></td>
                    <td>
                        <strong style="color:white;">${title}</strong><br>
                        <span style="color:#a0a0a0; font-size:0.85em;">${channelName}</span>
                    </td>
                    <td style="color: #00e676; font-weight: bold;">${subs.toLocaleString()}</td>
                    <td><a href="${videoLink}" target="_blank">Watch ↗</a></td>
                </tr>`;
                
                tableBody.innerHTML += row;
            }
        }

        if (foundOutliers) {
            statusBox.innerHTML = `<p style='color:#00C851;'>✅ Hunt Complete! Outlier videos mil gayi.</p>`;
            tableContainer.style.display = "block";
        } else {
            statusBox.innerHTML = `<p style='color:#ffbb33;'>⚠️ Videos toh mili, par sab bade channels ki thi (> ${maxSubs} subs).</p>`;
        }

    } catch (error) {
        statusBox.innerHTML = `<p style='color:#ff4444;'>❌ Error: ${error.message}</p>`;
    }

    resetButton();

    function resetButton() {
        huntBtn.disabled = false;
        huntBtn.style.opacity = "1";
        huntBtn.innerText = "Start Hunting";
    }
}
