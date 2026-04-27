#pragma once

#include "[require].h"




//
//Secondary API

namespace Reflex::System
{

	class Task;

}




//
//Task

class Reflex::System::Task : public Object
{
public:

	REFLEX_OBJECT(System::Task, Object);

	static Task & null;



	//interface

	virtual bool Completed() const = 0;

	bool Active() const { return !Completed(); }

};
