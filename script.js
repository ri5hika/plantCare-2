document.addEventListener('DOMContentLoaded', () => {
    const plantListDiv = document.getElementById('plant-list');
    const plantDetailsSection = document.getElementById('plant-details-section');
    const detailsPlantName = document.getElementById('details-plant-name');
    const detailsPlantSpecies = document.getElementById('details-plant-species');
    const detailsPlantImage = document.getElementById('details-plant-image');
    const detailsLastWatered = document.getElementById('details-last-watered');
    const detailsWateringFrequency = document.getElementById('details-watering-frequency');
    const detailsLightPref = document.getElementById('details-light-pref');
    const detailsNotes = document.getElementById('details-notes');
    const removePlantBtn = document.getElementById('remove-plant-btn');
    const addPlantBtn = document.getElementById('add-plant-btn');
    const addPlantModal = document.getElementById('add-plant-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addPlantForm = document.getElementById('add-plant-form');
    const waterReminderInput = document.getElementById('water-reminder');
    const setReminderBtn = document.getElementById('set-reminder-btn');
    const reminderStatus = document.getElementById('reminder-status');

    let currentSelectedPlant = null; // To keep track of the plant being viewed/edited

    // Function to fetch plants from the (simulated) API
    const fetchPlants = async () => {
        try {
            // In a real app, this would be: const response = await fetch('/api/plants');
            const response = await fetch('http://localhost:3000/plants'); // Assuming Node.js/Express backend
            const plants = await response.json();
            displayPlants(plants);
        } catch (error) {
            console.error('Error fetching plants:', error);
            plantListDiv.innerHTML = '<p class="text-red-500">Failed to load plants.</p>';
        }
    };

    // Function to display plants in the list
    const displayPlants = (plants) => {
        plantListDiv.innerHTML = ''; // Clear existing list
        if (plants.length === 0) {
            plantListDiv.innerHTML = '<p class="text-green-600 italic">No plants added yet. Click the "+" button!</p>';
            return;
        }

        plants.forEach(plant => {
            const plantCard = document.createElement('div');
            plantCard.className = 'plant-card bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center space-x-4 cursor-pointer hover:shadow-md hover:border-green-300 transition duration-200';
            plantCard.dataset.plantId = plant.id;
            plantCard.innerHTML = `
                <img src="${plant.imageUrl || 'https://via.placeholder.com/60/9FE2BF/ffffff?text=P'}" alt="${plant.name}" class="w-16 h-16 rounded-full object-cover shadow-sm">
                <div>
                    <h3 class="font-semibold text-green-800 text-lg">${plant.name}</h3>
                    <p class="text-sm text-green-600">${plant.species || 'Unknown Species'}</p>
                </div>
            `;
            plantCard.addEventListener('click', () => showPlantDetails(plant));
            plantListDiv.appendChild(plantCard);
        });
    };

    // Function to show plant details
    const showPlantDetails = (plant) => {
        currentSelectedPlant = plant;
        plantDetailsSection.classList.remove('hidden');
        detailsPlantName.textContent = plant.name;
        detailsPlantSpecies.textContent = plant.species || 'N/A';
        detailsPlantImage.src = plant.imageUrl || 'https://via.placeholder.com/200/9FE2BF/ffffff?text=Plant';
        detailsLastWatered.textContent = new Date(plant.lastWatered).toLocaleDateString();
        detailsWateringFrequency.textContent = plant.wateringFrequency;
        detailsLightPref.textContent = plant.lightPref;
        detailsNotes.textContent = plant.notes || 'No specific notes.';

        // Calculate next watering date
        const lastWateredDate = new Date(plant.lastWatered);
        lastWateredDate.setDate(lastWateredDate.getDate() + plant.wateringFrequency);
        waterReminderInput.value = lastWateredDate.toISOString().split('T')[0];
        updateReminderStatus(plant.nextWatering || lastWateredDate.toISOString().split('T')[0]);

        // Highlight selected plant card
        document.querySelectorAll('.plant-card').forEach(card => {
            card.classList.remove('border-green-400', 'ring-2', 'ring-green-300');
        });
        document.querySelector(`.plant-card[data-plant-id="${plant.id}"]`).classList.add('border-green-400', 'ring-2', 'ring-green-300');
    };

    // Function to update reminder status
    const updateReminderStatus = (nextWaterDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWater = new Date(nextWaterDate);
        nextWater.setHours(0, 0, 0, 0);

        const diffTime = nextWater.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            reminderStatus.textContent = "Water me today!";
            reminderStatus.classList.remove('text-teal-600', 'text-orange-500');
            reminderStatus.classList.add('text-red-600');
        } else if (diffDays > 0) {
            reminderStatus.textContent = `Next water in ${diffDays} day(s) on ${new Date(nextWaterDate).toLocaleDateString()}.`;
            reminderStatus.classList.remove('text-red-600', 'text-orange-500');
            reminderStatus.classList.add('text-teal-600');
        } else {
            reminderStatus.textContent = `You missed watering! Last reminder was for ${new Date(nextWaterDate).toLocaleDateString()}.`;
            reminderStatus.classList.remove('text-teal-600', 'text-red-600');
            reminderStatus.classList.add('text-orange-500');
        }
    };

    // Event listener for adding a new plant
    addPlantBtn.addEventListener('click', () => {
        addPlantModal.classList.remove('hidden');
        addPlantForm.reset(); // Clear previous form data
    });

    closeModalBtn.addEventListener('click', () => {
        addPlantModal.classList.add('hidden');
    });

    addPlantForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPlant = {
            name: document.getElementById('plant-name').value,
            species: document.getElementById('species').value,
            lastWatered: document.getElementById('last-watered').value,
            wateringFrequency: parseInt(document.getElementById('watering-frequency').value, 10),
            lightPref: document.getElementById('light-pref').value,
            notes: document.getElementById('notes').value,
            imageUrl: document.getElementById('image-url').value,
        };

        try {
            // In a real app: const response = await fetch('/api/plants', { ... });
            const response = await fetch('http://localhost:3000/plants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPlant),
            });
            if (response.ok) {
                addPlantModal.classList.add('hidden');
                fetchPlants(); // Refresh the plant list
            } else {
                alert('Failed to add plant. Please try again.');
            }
        } catch (error) {
            console.error('Error adding plant:', error);
            alert('An error occurred while adding the plant.');
        }
    });

    // Event listener for removing a plant
    removePlantBtn.addEventListener('click', async () => {
        if (!currentSelectedPlant || !confirm(`Are you sure you want to remove ${currentSelectedPlant.name}?`)) {
            return;
        }

        try {
            // In a real app: const response = await fetch(`/api/plants/${currentSelectedPlant.id}`, { method: 'DELETE' });
            const response = await fetch(`http://localhost:3000/plants/${currentSelectedPlant.id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                currentSelectedPlant = null; // Clear selected plant
                plantDetailsSection.classList.add('hidden'); // Hide details
                fetchPlants(); // Refresh the plant list
            } else {
                alert('Failed to remove plant. Please try again.');
            }
        } catch (error) {
            console.error('Error removing plant:', error);
            alert('An error occurred while removing the plant.');
        }
    });

    // Event listener for setting water reminder
    setReminderBtn.addEventListener('click', async () => {
        if (!currentSelectedPlant) return;

        const nextWateringDate = waterReminderInput.value;
        if (!nextWateringDate) {
            alert('Please select a valid date for the reminder.');
            return;
        }

        try {
            // In a real app, this would update the nextWatering field for the plant
            const response = await fetch(`http://localhost:3000/plants/${currentSelectedPlant.id}/reminder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nextWatering: nextWateringDate }),
            });

            if (response.ok) {
                currentSelectedPlant.nextWatering = nextWateringDate; // Update client-side data
                updateReminderStatus(nextWateringDate);
                alert('Watering reminder set successfully!');
            } else {
                alert('Failed to set reminder.');
            }
        } catch (error) {
            console.error('Error setting reminder:', error);
            alert('An error occurred while setting the reminder.');
        }
    });


    // Initial fetch of plants when the page loads
    fetchPlants();
});