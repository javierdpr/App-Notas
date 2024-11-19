// crea las constantes necesarias
const list = document.querySelector('#content');
const titleInput = document.querySelector('#title');
const bodyInput = document.querySelector('#body');
const form = document.querySelector('form');
const submitBtn = document.querySelector('form button');

// Crea una instancia de un objeto db para que almacenemos la base de datos abierta
let db;

// Abre nuestra base de datos; se crea si aún no existe
// (ve onupgradeneeded a continuación)
const openRequest = window.indexedDB.open('notes_db', 1);

// un controlador de error significa que la base de datos no se abrió correctamente
openRequest.addEventListener('error', () => console.error('Database failed to open'));

// controlador onsuccess significa que la base de datos se abrió correctamente
openRequest.addEventListener('success', () => {
  console.log('Database opened successfully');

  // Almacena el objeto de base de datos abierto en la variable db. Esto se usa mucho a continuación
  db = openRequest.result;

   // Ejecute la función displayData() para mostrar las notas que ya están en la IDB
  displayData();
});

// Configura las tablas de la base de datos si esto aún no se ha hecho
openRequest.addEventListener('upgradeneeded', e => {

  // Toma una referencia a la base de datos abierta
  db = e.target.result;

   // Crea un objectStore para almacenar nuestras notas (básicamente como una sola tabla)
  // incluyendo una clave de incremento automático
  const objectStore = db.createObjectStore('notes_os', { keyPath: 'id', autoIncrement:true });

  // Define qué elementos de datos contendrá el objectStore
  objectStore.createIndex('title', 'title', { unique: false });
  objectStore.createIndex('body', 'body', { unique: false });
  objectStore.createIndex('date', 'body', { unique: false });

  console.log('Database setup complete');
});

// Crea un controlador onsubmit para que cuando se envíe el formulario se ejecute la función addData()
form.addEventListener('submit', addData);

// Define la función addData()
function addData(e) {
  // evitar el predeterminado: no queremos que el formulario se envíe de la forma convencional
  e.preventDefault();

  // toma los valores ingresados en los campos del formulario y los almacenar en un objeto listo para ser insertado en la base de datos
  const newItem = { title: titleInput.value, body: bodyInput.value, date: new Date()};
      

  // abre una transacción de base de datos de lectura/escritura, lista para agregar los datos
  const transaction = db.transaction(['notes_os'], 'readwrite');

  // llama a un almacén de objetos que ya se ha agregado a la base de datos
  const objectStore = transaction.objectStore('notes_os');

  // Hacer una solicitud para agregar nuestro objeto newItem al almacén de objetos
  const addRequest = objectStore.add(newItem);

  addRequest.addEventListener('success', () => {
    // Limpiar el formulario, listo para agregar la siguiente entrada
    titleInput.value = '';
    bodyInput.value = '';
  });

 // Informa sobre el éxito de la transacción completada, cuando todo esté hecho
  transaction.addEventListener('complete', () => {
    console.log('Transaction completed: database modification finished.');

     // actualiza la visualización de datos para mostrar el elemento recién agregado, ejecutando displayData() nuevamente.
    displayData();
  });

  transaction.addEventListener('error', () => console.log('Transaction not opened due to error'));
}

// Define la función displayData()
function displayData() {
  
   // Aquí vaciamos el contenido del elemento de la lista cada vez que se actualiza la pantalla
  // Si no hiciste esto, obtendrás duplicados en la lista cada vez que se agregue una nueva nota
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }

  // Abre el almacén de objetos y luego obtiene un cursor, que recorre todos los
  // diferentes elementos de datos en el almacén
  const objectStore = db.transaction('notes_os').objectStore('notes_os');
  objectStore.openCursor().addEventListener('success', e => {
    // Obtiene una referencia al cursor
    const cursor = e.target.result;

    

    // Si todavía hay otro elemento de datos para iterar, sigue ejecutando este código
    if(cursor) {

      // Crea un elemento de div, h3 y p para poner cada elemento de datos dentro al mostrarlo
      // estructura el fragmento HTML y lo anexa dentro de la lista
      const listItem = document.createElement('div');
      const h3 = document.createElement('h3');
      const para = document.createElement('p');
      const date = document.createElement('p');

      listItem.appendChild(h3);
      listItem.appendChild(para);
      listItem.appendChild(date);
      list.appendChild(listItem);

      // Coloca los datos del cursor dentro de h3 y para
      h3.textContent = cursor.value.title;
      para.textContent = cursor.value.body;
      date.textContent = cursor.value.date.toLocaleDateString();

       // Almacena el ID del elemento de datos dentro de un atributo en listItem, para que sepamos
      // a qué elemento corresponde. Esto será útil más adelante cuando queramos eliminar elementos.
      listItem.setAttribute('data-note-id', cursor.value.id);
      listItem.setAttribute('id', "item");
      listItem.setAttribute('class', "drag-item");
      listItem.setAttribute('draggable', "True");

      // Crea un botón y lo coloca dentro de cada listItem
      const deleteBtn = document.createElement('button');
      listItem.appendChild(deleteBtn);
      deleteBtn.textContent = 'Delete';

       // Establece un controlador de eventos para que cuando se hace clic en el botón, el elemento deleteItem()
      // se ejecuta la función
      deleteBtn.addEventListener('click', deleteItem);

      // Iterar al siguiente elemento del cursor
      cursor.continue();
    } else {
      // Nuevamente, si el elemento de la lista está vacío, muestra el mensaje 'No hay notas almacenadas'
      if(!list.firstChild) {
        const listItem = document.createElement('p');
        listItem.textContent = 'No hay notas gauardadas.'
        list.appendChild(listItem);
      }
      // si no hay más elementos de cursor para iterar, dilo
      console.log('Notes all displayed');
    }
  });
}

// Define la función deleteItem()
function deleteItem(e) {
  // recuperamos el nombre de la tarea que queremos eliminar. Necesitamos
  // convertirla en un número antes de intentarla úselo con IDB; Clave del IDB
  // los valores son sensibles al tipo.
  const noteId = Number(e.target.parentNode.getAttribute('data-note-id'));

   // abre una transacción de base de datos y elimina la tarea, encontrándola usando la identificación que obtuvimos arriba
  const transaction = db.transaction(['notes_os'], 'readwrite');
  const objectStore = transaction.objectStore('notes_os');
  const deleteRequest = objectStore.delete(noteId);

  // informa que el elemento de datos ha sido eliminado
  transaction.addEventListener('complete', () => {
     // elimina el padre del botón
    // que es el elemento de la lista, por lo que ya no se muestra
    e.target.parentNode.parentNode.removeChild(e.target.parentNode);
    console.log(`Note ${noteId} deleted.`);

     // Nuevamente, si el elemento de la lista está vacío, muestra el mensaje 'No hay notas almacenadas'
    if(!list.firstChild) {
      const listItem = document.createElement('p');
      listItem.textContent = 'No hay notas gauardadas.';
      list.appendChild(listItem);
    }
  });
}
  