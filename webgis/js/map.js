$(document).ready(function () {
    // Initialize the map
    const mymap = L.map("mapdiv", {
        center: [-2.5, 120.0],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
    });

    // Add base layers
    const lyrOSM = L.tileLayer.provider("OpenStreetMap.Mapnik");
    const lyrTopo = L.tileLayer.provider("OpenTopoMap");
    const lyrImagery = L.tileLayer.provider("Esri.WorldImagery");
    const lyrOutdoors = L.tileLayer.provider("Thunderforest.Outdoors");
    const lyrWatercolor = L.tileLayer.provider("Stamen.Watercolor");
    mymap.addLayer(lyrOSM);

    const objBasemaps = {
        "Open Street Maps": lyrOSM,
        "Topo Map": lyrTopo,
        "Imagery": lyrImagery,
        "Outdoors": lyrOutdoors,
        "Watercolor": lyrWatercolor,
    };

    // Add layer control
    const ctlLayers = L.control.layers(objBasemaps).addTo(mymap);

    // Initialize the sidebar control
    const ctlSidebar = L.control.sidebar("side-bar").addTo(mymap);
    const ctlSidebar2 = L.control.sidebar("side-bar-2").addTo(mymap);

    // Add a button to toggle the sidebar
    const ctlEasybutton = L.easyButton("glyphicon-transfer", function () {
        ctlSidebar.toggle();
        
    }).addTo(mymap);

    // Additional map controls
    const ctlAttribute = L.control.attribution().addTo(mymap);
    ctlAttribute.addAttribution("OSM");
    ctlAttribute.addAttribution(
        '&copy; <a href="http://millermountain.com">Miller Mountain LLC</a>'
    );

    const ctlScale = L.control
        .scale({ position: "bottomleft", metric: false, maxWidth: 200 })
        .addTo(mymap);

    const ctlMouseposition = L.control.mousePosition().addTo(mymap);

    // GeoJSON layer groups
    let geoJsonLayer = L.layerGroup().addTo(mymap);
    let aitGeoJsonLayer = L.layerGroup().addTo(mymap);

    // Function to determine color based on month field ('Bulan')
    function getColorByMonth(month) {
        switch (month) {
            case 'Jan': return 'blue';
            case 'Feb': return 'green';
            case 'Mar': return 'yellow';
            case 'Apl': return 'purple';
            case 'Mei': return 'pink';
            case 'Jun': return 'red';
            case 'Jul': return 'orange';
            case 'Aug': return 'cyan';
            case 'Sep': return 'magenta';
            case 'Oct': return 'brown';
            case 'Nov': return 'gray';
            case 'Dec': return 'violet';
            default: return 'black'; // In case of an invalid month
        }
    }

    // Function to classify severity by ranking
    function getSeverityColorByRank(burnedArea, ranks) {
        const rank = ranks.findIndex((r) => r === burnedArea);
        
        // Divide into quantiles by rank
        const totalProvinces = ranks.length;
        const highThreshold = Math.floor(totalProvinces / 3);
        const moderateThreshold = 2 * highThreshold;

        if (rank < highThreshold) return 'red';        // High severity (top third)
        if (rank < moderateThreshold) return 'orange'; // Moderate severity (middle third)
        return 'green';                                // Low severity (bottom third)
    }

    // Load GeoJSON data
    function loadGeoJsonData() {
        fetch('data/prov1.json')
            .then(response => response.json())
            .then(provData => {
                const provinceSelect = document.getElementById('provinceSelect');
                provData.features.forEach((feature) => {
                    const provinceId = feature.properties.queryid;
                    const provinceName = feature.properties.WADMPR;
                    const option = document.createElement('option');
                    option.value = provinceId;
                    option.textContent = provinceName;
                    provinceSelect.appendChild(option);
                });

                provinceSelect.addEventListener('change', (event) => {
                    const selectedProvinceId = event.target.value;
                    if (selectedProvinceId) {
                        showProvinceData(selectedProvinceId, provData);
                    } else {
                        geoJsonLayer.clearLayers();
                        aitGeoJsonLayer.clearLayers();
                    }
                });
            })
            .catch(error => console.error('Error fetching prov GeoJSON data:', error));

        fetch('data/AIT1.json')
            .then(response => response.json())
            .then(aitData => {
                window.aitData = aitData;
            })
            .catch(error => console.error('Error fetching AIT GeoJSON data:', error));
            
    }

    // Load GeoJSON  kab
    function showRegionData(regionId, regionGeoJsonData) {
      geoJsonLayer.clearLayers();
      aitGeoJsonLayer.clearLayers();
  
      const selectedRegion = regionGeoJsonData.features.find(
          (feature) => parseInt(feature.properties.querykab) === parseInt(regionId)
      );
  
      if (!selectedRegion) {
          console.error("Region not found.");
          return;
      }
  
      L.geoJSON(selectedRegion, {
          style: {
              color: "blue", // Warna default untuk kabupaten
              weight: 2,
              opacity: 1,
          },
          onEachFeature: (feature, layer) => {
              layer.bindPopup(`
                  <strong>Kabupaten:</strong> ${feature.properties.WADMKK}<br>
                  <strong>Area:</strong> ${Math.round(feature.properties.LREGION)} Ha
              `);
          },
      }).addTo(geoJsonLayer);
  
  
  

      fetch('data/AIT1.json')
          .then(response => response.json())
          .then(aitData => {
              window.aitData = aitData;
          })
          .catch(error => console.error('Error fetching AIT GeoJSON data:', error));
          
  }
    
    // Modified function to show province data with indicative burn classification
    function showProvinceData(provinceId, provGeoJsonData) {
        geoJsonLayer.clearLayers();
        aitGeoJsonLayer.clearLayers();

        const selectedProvince = provGeoJsonData.features.find(
            (feature) => parseInt(feature.properties.queryid) === parseInt(provinceId)
        );

        const totalArea = selectedProvince.properties.total_area;
        const burnedArea = selectedProvince.properties.LPROV;

        // Get ranking list of burned areas across all provinces
        const burnedAreas = provGeoJsonData.features.map(feature => feature.properties.LPROV);
        const ranks = burnedAreas.sort((a, b) => b - a); 

        // Display indicative burn data
        L.geoJSON(selectedProvince, {
            style: {
                color: getSeverityColorByRank(burnedArea, ranks), 
                weight: 2,
                opacity: 1,
            },
            onEachFeature: (feature, layer) => {
                const burnRatio = (burnedArea / totalArea) * 100;
                layer.bindPopup(`
                <strong>Provinsi:</strong> ${feature.properties.WADMPR}<br>
                <strong>Total Area Indikasi:</strong> ${Math.round(feature.properties.LPROV)} Ha<br>
                `);
            }
        }).addTo(geoJsonLayer);

        // Filter AIT data for the selected province
        const selectedAit = window.aitData.features.filter((feature) => {
            return parseInt(feature.properties.queryid) === parseInt(provinceId);
        });

        // Add GeoJSON layer for AIT data
        aitGeoJsonLayer = L.geoJSON(selectedAit, {
            style: (feature) => ({
                color: getColorByMonth(feature.properties.bulan),
                weight: 2,
                opacity: 0.7,
                zIndex: 500
            }),
            onEachFeature: function (feature, layer) {
                const popupContent = `
                    Provinsi: ${feature.properties.WADMPR}<br>
                    Kabupaten: ${feature.properties.WADMKK}<br>
                    Kecamatan: ${feature.properties.WADMKC}<br>
                    ${feature.properties.TIPADM}: ${feature.properties.WADMKD}<br>
                    Month: ${feature.properties.bulan}<br>
                    Frekuensi: ${feature.properties.Frekuensi}<br>
                    Luas: ${Math.round(feature.properties.LPROV)} Ha
                `;
                layer.bindPopup(popupContent);
            }
        }).addTo(mymap);

        

        // Zoom the map to the selected province bounds
        const bounds = L.geoJSON(selectedProvince).getBounds();
        mymap.fitBounds(bounds);
    }

    $(document).ready(function () {
        // Event listener untuk tombol toggle sidebar 2
        $('#btnToggleSidebar').on('click', function () {
          $('#side-bar-2').toggle(); // Menampilkan atau menyembunyikan sidebar
        });
      });
      
      $(document).ready(function () {
        const dataSelect = $("#dataSelect");
        const tableContainer = $("#tableContainer");
        const tableBody = $("#attributeTable tbody");
        const tableHeaders = $("#attributeTable thead");
        const btnToggleTable = $("#btngtabel"); // Button to toggle table visibility
    
        // Function to populate the table with data from a GeoJSON file
        function populateTable(data) {
            // Clear the table contents
            tableBody.empty();  
            tableHeaders.empty();
    
            // Extract field names from the first feature's properties
            const fields = Object.keys(data.features[0].properties);
    
            // Create table headers
            const headerRow = $("<tr></tr>");
            fields.forEach((field) => {
                headerRow.append(`<th>${field}</th>`);
            });
            tableHeaders.append(headerRow);
    
            // Populate table rows with data
            data.features.forEach((feature) => {
                const row = $("<tr></tr>");
                fields.forEach((field) => {
                    row.append(`<td>${feature.properties[field]}</td>`);
                });
                tableBody.append(row);
            });
    
            // Show the table container after populating
            tableContainer.show();
            btnToggleTable.text("Tutup Tabel"); // Update button text to "Tutup Tabel"
    
            // Check if DataTable is already initialized and destroy if true
            if ($.fn.DataTable.isDataTable("#attributeTable")) {
                $('#attributeTable').DataTable().clear().destroy();
            }
    
            // Re-initialize DataTable with desired options
            $('#attributeTable').DataTable({
                "paging": true,
                "pageLength": 10,
                "lengthMenu": [10, 25, 50, 100],
                "searching": true,
                "ordering": true,
                "info": true,
                "autoWidth": false,
                "deferRender": true
            });
        }
    
        // Function to add options to the dropdown based on GeoJSON files
        function addOptionsFromGeoJSON(fileName, label) {
            const option = $("<option></option>")
                .val(fileName)
                .text(label);
            dataSelect.append(option);
        }
    
        // Add options for available GeoJSON files
        // addOptionsFromGeoJSON("data/prov.geojson", "Data Provinsi");
        addOptionsFromGeoJSON("data/AIT1.json", "Data AIT");
        addOptionsFromGeoJSON("data/prov1.json", "Data Provinsi");
        
    
        // Update the table when the data selection changes
        dataSelect.change(function () {
            const selectedValue = $(this).val();
               
            // Load data based on selection and populate the table
            if (selectedValue === "data/prov1.json") {
                $.getJSON("data/prov.geojson", function (data) {
                    populateTable(data);
                });
            } else if (selectedValue === "data/AIT1.json") {
                $.getJSON("data/AIT1.json", function (data) {
                    populateTable(data);
                });
            } else {
                // Hide the table if no file is selected
                tableContainer.hide();
                btnToggleTable.text("Tutup Tabel"); // Reset button text
            }
        });
    
        // Button click event to toggle the table visibility
        btnToggleTable.click(function () {
            // Toggle visibility of tableContainer
            tableContainer.toggle();
            
            // Update button text based on visibility
            if (tableContainer.is(":visible")) {
                btnToggleTable.text("Tutup Tabel");
            } else {
                btnToggleTable.text("Buka Tabel");
            }
        });
    });

    // Get the "Tutup Grafik" button
const tutupGrafikBtn = document.getElementById('Tutup Grafik');

// Event listener for "Tutup Grafik" button to close the chart
tutupGrafikBtn.addEventListener('click', () => {
  // Hide the chart canvas and chart container
  canvas.style.display = 'none';
  chartContainer.style.display = 'none';
  
  // Destroy the current chart if it exists
  if (window.chart) {
    window.chart.destroy();
  }
});
    
 // Get button, div, and canvas elements
const btnGrafik = document.getElementById('btnGrafikTabel');
const grafikOptions = document.getElementById('grafikOptions');
const chartContainer = document.getElementById('chartContainer');
const canvas = document.getElementById('grafikCanvas');
const ctx = canvas.getContext('2d');

// Hide/display the chart options div
btnGrafik.addEventListener('click', () => {
  grafikOptions.style.display = grafikOptions.style.display === 'none' ? 'block' : 'none';
});

// Event listeners to show different charts based on the selected button
document.getElementById('grafik1').addEventListener('click', () => loadDataAndShowChart('1'));
document.getElementById('grafik2').addEventListener('click', () => loadDataAndShowChart('2'));
document.getElementById('grafik3').addEventListener('click', () => loadDataAndShowChart('3'));

async function loadDataAndShowChart(grafikType) {
  try {
    const response = await fetch('data/prov.json');
    const provData = await response.json();
  
    // Log provData to inspect its structure
    console.log('Fetched Data:', provData);
  
    // Check if provData contains the array directly, or within a property
    const dataArray = Array.isArray(provData) ? provData : provData.data;
  
    // Extract provinces and fire-affected areas if dataArray is valid
    if (!Array.isArray(dataArray)) {
      throw new Error("Data format is incorrect. Expected an array.");
    }
  
    const labels = [];
    const data = [];
  
    dataArray.forEach(item => {
      if (item.WADMPR && item.LPROV) {
        labels.push(item.WADMPR); // Province name
        data.push(parseFloat(item.LPROV)); // Area affected
      }
    });
  
    console.log('Parsed data:', { labels, data });
  
    // Render the chart with parsed data
    renderChart(grafikType, labels, data);
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Function to render the chart with dynamic data
function renderChart(grafikType, labels, data) {
  // Destroy previous chart if it exists
  if (window.chart) {
    window.chart.destroy();
  }

  // Display the canvas and chart container
  canvas.style.display = 'block';
  chartContainer.style.display = 'block';

  // Define the dataset for the chart
  const chartData = {
    labels: labels,
    datasets: [{
      label: `Luas Area Terbakar per Provinsi`,
      data: data,
      borderColor: 'rgb(255, 99, 132)', // color for line chart
      backgroundColor: grafikType === '2' ? generateRandomColors(data.length) : 'rgba(255, 99, 132, 0.2)', // Pie chart with random colors
      fill: grafikType === '3', // fill only for bar chart type
    }]
  };

  // Chart options
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    // Apply 3D effects for pie and bar chart
    elements: {
      arc: {
        borderWidth: 0, // For pie chart, make the borders invisible
      },
    },
    ...(grafikType === '2' || grafikType === '3' ? {
      rotation: Math.PI / 4, // 3D Rotation for Pie and Bar
      perspective: 1000,  // 3D perspective for better depth effect
    } : {})
  };

  // Determine chart type based on grafikType
  let chartType;
  if (grafikType === '1') {
    chartType = 'line';
  } else if (grafikType === '2') {
    chartType = 'pie';
  } else if (grafikType === '3') {
    chartType = 'bar';
  }

  // Render the chart
  try {
    window.chart = new Chart(ctx, {
      type: chartType,
      data: chartData,
      options: options,
    });
    console.log('Chart rendered successfully');
  } catch (error) {
    console.error('Error rendering chart:', error);
  }
}

// Function to generate random colors for pie chart slices
function generateRandomColors(num) {
  const colors = [];
  for (let i = 0; i < num; i++) {
    const randomColor = `hsl(${Math.random() * 360}, 100%, 70%)`; // Random HSL color
    colors.push(randomColor);
  }
  return colors;
}


  
    // Toggle button functionality to show entire AIT data on map
    $('#btnLocate').on('click', function () {
        aitGeoJsonLayer.clearLayers(); // Remove any existing AIT data from the map

        // Add entire AIT GeoJSON data to the map
        L.geoJSON(window.aitData, {
            style: (feature) => ({
                color: getColorByMonth(feature.properties.bulan),
                weight: 2,
                opacity: 0.7,
                zIndex: 500
            }),
            onEachFeature: function (feature, layer) {
                const popupContent = `
                    AIT ID: ${feature.properties.queryid}<br>
                    Month: ${feature.properties.bulan}<br>
                    Additional Info: ${feature.properties.additional_info || 'No additional info'}
                `;
                layer.bindPopup(popupContent);
            }
        }).addTo(aitGeoJsonLayer);

        // Zoom to the bounds of the entire AIT data
        const aitBounds = aitGeoJsonLayer.getBounds();
        mymap.fitBounds(aitBounds);
    });

    // Load GeoJSON data on page load
    loadGeoJsonData();
});
