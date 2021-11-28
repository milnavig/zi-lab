let username = document.getElementById('username');
let submit = document.getElementById('submit');
let result = document.getElementById('result');
let password = document.getElementById('password');
let connect = document.getElementById('connect');
let authForm = document.getElementById('auth-form');
let result_connect = document.getElementById('result-connect');
let server_container = document.getElementById('server-container');
let users_container = document.getElementById('users-container');
let container = document.getElementById('container');
let removeUser = document.getElementsByClassName('removeUser');
let sessionKey;

let socket = new WebSocket('ws://localhost:5533/');

socket.onopen = () => {
    console.log('Socket was opened');
}

socket.onmessage = (event) => {
    console.log(event.data);
    fetch('/decrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(JSON.parse(event.data))
    }).then(res => res.json()).then(decrypted => { 
        console.log(decrypted);
        decrypted = JSON.parse(decrypted);

        if (decrypted.token) {
            localStorage.setItem('token', decrypted.token.token);
            localStorage.setItem('role', decrypted.token.role);

            if (decrypted.status === 'Fine') {
                container.style.display = "none";

                server_container.innerHTML = decrypted.html;

                if (decrypted.token.role === "admin") {
                    //window.location.href = "http://localhost:5531/admin.html";
                    let getUsers = {
                        type: 'getUsers',
                        data: {
                            token: localStorage.getItem('token')
                        }
                    }
        
                    fetch('/encrypt', {
                        method: 'POST',
                        headers: {
                        'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(getUsers)
                    }).then(res => res.json()).then(encrypted => { 
                        socket.send(JSON.stringify(encrypted));
                    })
                } else if (decrypted.token.role === 'user') {
                    let getText = {
                        type: 'getText',
                        data: {
                            token: localStorage.getItem('token')
                        }
                    }
        
                    fetch('/encrypt', {
                        method: 'POST',
                        headers: {
                        'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(getText)
                    }).then(res => res.json()).then(encrypted => { 
                        socket.send(JSON.stringify(encrypted));
                    })
                }
            } else {
                result.innerHTML = decrypted.status;
            }
        } else if (decrypted.action === 'getUsers') {
            console.log(decrypted)
            updateUsers(decrypted);
        } else if (decrypted.action === 'updateUsers') {
            console.log(decrypted)
            updateUsers(decrypted);
        } else if (decrypted.action === 'text') {
            console.log(decrypted)
            server_container.innerHTML = server_container.innerHTML + '<br>' + decrypted.text;
        }
    })
}

function updateUsers(decrypted) {
    users_container.innerHTML = '';
    let header = document.createElement('h2');
    header.innerHTML = 'Users';
    users_container.append(header);
    decrypted.users.forEach(e => {
        const userBlock = document.createElement('div');
        
        const user = document.createElement('div');
        user.innerHTML = `username: <b>${e.username}</b>, role: <b>${e.role}</b>`;
        const deleteUser = document.createElement('button');
        deleteUser.innerHTML = 'Remove user ' + e.username;
        deleteUser.setAttribute('id', 'user-' + e.username);
        deleteUser.setAttribute('class', 'removeUser');
        setEventListener(deleteUser);
        userBlock.append(user);
        userBlock.append(deleteUser);
        users_container.append(userBlock);
    })
}

socket.onclose = () => {

}

socket.onerror = () => {

}

connect.addEventListener('click', (e) => {
    e.preventDefault();
    
    fetch('/connect').then(res => res.json()).then(session => {
        console.log(session);
        session = session.session;
        result_connect.innerHTML = "You have successfully connected!";
        connect.style.display = "none";
        authForm.style.display = "block";
    });
})

submit.addEventListener('click', (e) => {
    e.preventDefault();
    
    let loginData = {
        type: 'login',
        data: {
            username: username.value,
            password: password.value
        }
    }

    fetch('/encrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    }).then(res => res.json()).then(encrypted => { 
        socket.send(JSON.stringify(encrypted));
    })

})

function setEventListener(t) {
    t.addEventListener('click', (e) => {
        e.preventDefault();

        let username = t.getAttribute('id').split('-')[1];
        
        let deleteUserData = {
            type: 'deleteUser',
            data: { username }
        }
    
        fetch('/encrypt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(deleteUserData)
        }).then(res => res.json()).then(encrypted => { 
            socket.send(JSON.stringify(encrypted));
        })
    })
}