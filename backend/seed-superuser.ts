import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './src/users/entities/user.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'admin_password',
  database: process.env.DB_DATABASE || 'finca_hml',
  entities: [User],
  synchronize: false,
});

async function run() {
  try {
    await AppDataSource.initialize();
    console.log('Conectado a la base de datos.');

    const userRepository = AppDataSource.getRepository(User);

    const username = 'superuser';
    let user = await userRepository.findOne({ where: { username } });

    if (!user) {
      user = new User();
      user.username = username;
      user.password_hash = await bcrypt.hash('super123', 10);
      user.role = UserRole.SUPERUSER;
      await userRepository.save(user);
      console.log('Superusuario creado exitosamente:');
    } else {
      user.role = UserRole.SUPERUSER;
      user.password_hash = await bcrypt.hash('super123', 10); // reset password just in case
      await userRepository.save(user);
      console.log('El usuario ya existía, rol actualizado a SUPERUSER y contraseña reiniciada:');
    }
    
    console.log(`Usuario: ${user.username}`);
    console.log(`Contraseña: super123`);

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
