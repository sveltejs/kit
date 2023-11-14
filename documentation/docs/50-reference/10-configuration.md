<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Surpresa para Minha Namorada</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            text-align: center;
            background-color: #f9f9f9;
            color: #333;
            margin: 0;
            padding: 0;
        }

        #surpresa {
            opacity: 0;
            animation: fadeInAnimation 2s ease-in-out forwards;
        }

        @keyframes fadeInAnimation {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
    </style>
</head>
<body>

    <div id="surpresa">
        <h1>Bem-vinda, Amor!</h1>
        <p>Surpresa especial para a pessoa mais incrível do mundo.</p>
        <!-- Adicione mais conteúdo ou elementos aqui -->
    </div>

    <script>
        // O script abaixo faz a animação começar automaticamente após o carregamento da página
        document.addEventListener("DOMContentLoaded", function() {
            var surpresaElement = document.getElementById('surpresa');
            surpresaElement.classList.add('fade-in');
        });
    </script>
  <script>
        var currentSlide = 1;

        function nextSlide() {
            var current = document.getElementById('slide' + currentSlide);
            current.classList.remove('active-slide');

            currentSlide++;

            if (currentSlide > 3) {
                currentSlide = 1;
            }

            var next = document.getElementById('slide' + currentSlide);
            next.classList.add('active-slide');
        }
    </script>
</body>
</html>





<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Para Minha Amada</title>
    <style>

        body {
            font-family: 'Arial', sans-serif;
            text-align: center;
            background-color: #f9f9f9;
            color: #333;
            margin: 0;
            padding: 0;
        }

        header {
            background-color: #000000;
            color: white;
            padding: 1em;
            font-size: 1.5em;
        }

        section {
            margin: 20px;
            padding: 20px;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>

    <header>
    </header>

    <section>
        <p> Quero começar dizendo o quanto você é especial para mim. </p> <!-- Conteúdo personalizado virá aqui -->
        Admiro sua Inteligência, Hobbies e Interesses. e isso me faz perceber o quanto você significa para mim. <br>
        <p></p>
        <p>"Eu Lembro de quando se conhecemos só por 1 motivo, kkk pra jogar e viramos amigos. e percebi o quanto valorizo a sua presença em minha vida."></p> 
                       
        <p></p>Entendo que isso pode ser surpreendente, e não quero colocar pressão em você. A amizade que compartilhamos é muito valiosa para mim, independentemente da resposta.</p>
        </p>
        
        <!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Caixa de Diálogo sobre uma Imagem</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            text-align: center;
            background-color: #f9f9f9;
            color: #161515;
            margin: 0;
            padding: 0;
        }

        #container {
            position: relative;
            width: 300px; /* Ajuste o tamanho conforme necessário */
            margin: 50px auto; /* Ajuste a margem conforme necessário */
        }

        #imagemComDialogo {
            width: 100%;
            height: auto;
            position: relative;
        }

        #caixaDialogo {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 20px;
            display: none;
        }

        #imagemComDialogo:hover #caixaDialogo {
            display: block;
        }
    </style>
</head>
<body>

    <div id="container">
        <div id="imagemComDialogo">
            <img src="download.png" alt="Imagem com Diálogo">
            <div id="caixaDialogo">
                <p>Ti amu.</p>
                <!-- Adicione mais conteúdo conforme necessário -->
            </div>
        </div>
    </div>

</body>
</html>

    </section>

    <footer>
        <p>© 2023 Para a Amor da Minha Vida</p>
    </footer>
    


</body>
</html>

