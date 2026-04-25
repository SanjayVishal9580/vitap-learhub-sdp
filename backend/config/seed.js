const User = require('../models/User');
const Course = require('../models/Course');

const courses = [
  { courseCode: 'MAT1002', courseName: 'Applications of Differential and Difference Equations' },
  { courseCode: 'CSE3013', courseName: 'Applied Statistics' },
  { courseCode: 'CSE3010', courseName: 'Artificial Intelligence' },
  { courseCode: 'MAT1001', courseName: 'Calculus for Engineers' },
  { courseCode: 'CSE2008', courseName: 'Computer Networks' },
  { courseCode: 'CSE3014', courseName: 'Computer Organization and Architecture' },
  { courseCode: 'CSE2001', courseName: 'Data Structures and Algorithms' },
  { courseCode: 'CSE2007', courseName: 'Database Management Systems' },
  { courseCode: 'CSE3017', courseName: 'Deep Learning' },
  { courseCode: 'CSE3004', courseName: 'Design and Analysis of Algorithms' },
  { courseCode: 'CSE3012', courseName: 'Digital Image Processing' },
  { courseCode: 'CSE3018', courseName: 'Digital Logic Design' },
  { courseCode: 'MAT1003', courseName: 'Discrete Mathematical Structures' },
  { courseCode: 'CSE3019', courseName: 'Foundations for Data Analytics' },
  { courseCode: 'CSE3020', courseName: 'Fundamentals of Electrical and Electronics Engineering' },
  { courseCode: 'CSE3011', courseName: 'Introduction to Machine Learning' },
  { courseCode: 'CSE1013', courseName: 'Natural Language Processing' },
  { courseCode: 'CSE1014', courseName: 'Object Oriented Programming' },
  { courseCode: 'CSE2009', courseName: 'Operating Systems' },
  { courseCode: 'CSE1012', courseName: 'Problem Solving Using Python' },
  { courseCode: 'CSE2010', courseName: 'Software Engineering' },
  { courseCode: 'CSE3015', courseName: 'Theory of Computation' },
];

const seedData = async () => {
  try {
    // Seed admin
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@vitap.ac.in' });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@vitap.ac.in',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
        role: 'admin',
      });
      console.log('✓ Admin account created');
    }

    // Seed courses
    for (const course of courses) {
      const exists = await Course.findOne({ courseCode: course.courseCode });
      if (!exists) {
        await Course.create(course);
      }
    }
    console.log('✓ Courses seeded (22 courses)');
  } catch (error) {
    // If duplicate key errors, ignore (already seeded)
    if (error.code !== 11000) {
      console.error('Seed error:', error.message);
    }
  }
};

module.exports = seedData;
