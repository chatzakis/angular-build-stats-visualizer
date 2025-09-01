const upload = document.getElementById("upload");
upload.addEventListener("change", handleFile);

function handleFile(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
    const stats = JSON.parse(e.target.result);
    visualize(stats);
    };
    reader.readAsText(file);
}

function getPackageName(path) {
  if (!path.includes("node_modules")) return "app";

  // Normalize to forward slashes to avoid Windows backslash issue
  const normalized = path.replace(/\\/g, "/");

  const afterNodeModules = normalized.split("node_modules/")[1];
  if (!afterNodeModules) return "unknown";

  const parts = afterNodeModules.split("/");
  return parts[0].startsWith("@") ? parts[0] + "/" + parts[1] : parts[0];
}

function visualize(stats) {
    const firstOutputKey = Object.keys(stats.outputs)[0];
    const inputs = stats.outputs[firstOutputKey].inputs;
    
    let totalBytes = 0;

    // Aggregate sizes per package
    const pkgMap = {};
    Object.entries(inputs).forEach(([path, data]) => {
        const pkg = getPackageName(path);
        pkgMap[pkg] = (pkgMap[pkg] || 0) + data.bytesInOutput;
        totalBytes += data.bytesInOutput;
    });

    const modules = Object.entries(pkgMap).map(([name, size]) => ({ name, size }));

    const root = d3.hierarchy({ children: modules })
    .sum(d => d.size)
    .sort((a, b) => b.value - a.value);

    const width = document.getElementById("chart").clientWidth;
    const height = document.getElementById("chart").clientHeight;

    d3.select("#chart").selectAll("*").remove(); // reset

    const treemap = d3.treemap()
    .size([width, height])
    .padding(1);

    treemap(root);

    const div = d3.select("#chart");

    div.selectAll(".node")
    .data(root.leaves())
    .join("div")
    .attr("class", "node")
    .attr("title", d => `${d.data.name} (${(d.value/1024).toFixed(2)} KB)`)
    .style("left", d => d.x0 + "px")
    .style("top", d => d.y0 + "px")
    .style("width", d => (d.x1 - d.x0) + "px")
    .style("height", d => (d.y1 - d.y0) + "px")
    .style("background", (d, i) => d3.schemeSet3[i % 10])
    .html(d => `${d.data.name}<br>(${(d.value/1024).toFixed(1)} KB)`)

    // Update total size display
    document.querySelector("span").textContent = `Total Size: ${(totalBytes / 1024).toFixed(2)} KB`;
    
    // Show JSON under the graph (sorted by size)
    const sorted = Object.entries(pkgMap)
       .sort((a, b) => b[1] - a[1])
       .reduce((acc, [name, size]) => {
           acc[name] = (size / 1024).toFixed(2) + " KB";
           return acc;
    }, {});
    
    document.getElementById("jsonOutput").textContent = JSON.stringify(sorted, null, 2);
}
